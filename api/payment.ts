import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import prisma from './lib/db';
import { applyCors, handleCorsPreflightRequest } from './lib/cors';
import { rateLimiters, getClientIP } from './lib/rateLimit';

// 微信支付配置
const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';
const WECHAT_MCHID = process.env.WECHAT_MCHID || '';
const WECHAT_API_KEY = process.env.WECHAT_API_KEY || '';
const WECHAT_SERIAL_NO = process.env.WECHAT_SERIAL_NO || '';
const WECHAT_PRIVATE_KEY = (process.env.WECHAT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// 支付金额（分）
const PAYMENT_AMOUNT = 190; // 1.9元
const PAYMENT_DESCRIPTION = '内耗指数测评报告';

// 回调地址
const getNotifyUrl = () => {
  const baseUrl = process.env.PAYMENT_NOTIFY_URL || 'https://bettermee.cn';
  return `${baseUrl}/api/payment?action=notify`;
};

// 生成随机字符串
function generateNonceStr(): string {
  return crypto.randomBytes(16).toString('hex');
}

// 生成商户订单号
function generateOutTradeNo(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex');
  return `NH${timestamp}${random}`;
}

// 生成签名
function generateSignature(
  method: string,
  url: string,
  timestamp: string,
  nonceStr: string,
  body: string
): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(WECHAT_PRIVATE_KEY, 'base64');
}

// 构建 Authorization header
function buildAuthHeader(
  method: string,
  url: string,
  body: string
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const signature = generateSignature(method, url, timestamp, nonceStr, body);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_MCHID}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${WECHAT_SERIAL_NO}"`;
}

// JSAPI支付签名（前端调起支付用）
function generateJSAPISign(
  appId: string,
  timeStamp: string,
  nonceStr: string,
  packageStr: string
): string {
  const message = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(WECHAT_PRIVATE_KEY, 'base64');
}

// 解密回调数据
function decryptNotifyData(ciphertext: string, nonce: string, associatedData: string): any {
  const key = Buffer.from(WECHAT_API_KEY, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const authTag = Buffer.from(ciphertext.slice(-24), 'base64');
  const data = Buffer.from(ciphertext.slice(0, -24), 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));

  let decrypted = decipher.update(data);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}

// Native支付 - 生成二维码
async function handleNativePayment(req: VercelRequest, res: VercelResponse) {
  const { visitorId } = req.body;

  if (!visitorId) {
    return res.status(400).json({ error: '缺少用户标识' });
  }

  // 限流检查
  const clientIP = getClientIP(req);
  const limit = rateLimiters.codeValidation(clientIP);
  if (!limit.success) {
    return res.status(429).json({ error: '请求过于频繁', retryAfter: limit.retryAfter });
  }

  const outTradeNo = generateOutTradeNo();
  const requestBody = {
    appid: WECHAT_APPID,
    mchid: WECHAT_MCHID,
    description: PAYMENT_DESCRIPTION,
    out_trade_no: outTradeNo,
    notify_url: getNotifyUrl(),
    amount: {
      total: PAYMENT_AMOUNT,
      currency: 'CNY'
    }
  };

  const url = '/v3/pay/transactions/native';
  const body = JSON.stringify(requestBody);
  const authorization = buildAuthHeader('POST', url, body);

  try {
    const response = await fetch('https://api.mch.weixin.qq.com' + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body,
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('微信支付API错误:', data);
      return res.status(500).json({ error: '创建支付订单失败', detail: data.message });
    }

    // 保存订单到数据库
    await prisma.order.create({
      data: {
        visitorId,
        outTradeNo,
        amount: PAYMENT_AMOUNT,
        status: 'PENDING',
        paymentMethod: 'WECHAT_NATIVE',
        codeUrl: data.code_url,
      }
    });

    return res.status(200).json({
      success: true,
      outTradeNo,
      codeUrl: data.code_url,
      amount: PAYMENT_AMOUNT,
    });
  } catch (error) {
    console.error('创建Native支付失败:', error);
    return res.status(500).json({ error: '支付服务异常' });
  }
}

// 微信授权域名（用于中转）
const WECHAT_OAUTH_DOMAIN = process.env.WECHAT_OAUTH_DOMAIN || '';

// 获取微信授权URL
async function handleOAuth(req: VercelRequest, res: VercelResponse) {
  const { redirectUrl } = req.body;

  if (!redirectUrl) {
    return res.status(400).json({ error: '缺少回调地址' });
  }

  // 如果配置了授权中转域名，使用中转模式
  if (WECHAT_OAUTH_DOMAIN) {
    // 中转回调地址：lying.bettermee.cn/api/payment?action=oauth-callback&target=原始地址
    const callbackUrl = `${WECHAT_OAUTH_DOMAIN}/api/payment?action=oauth-callback&target=${encodeURIComponent(redirectUrl)}`;
    const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=snsapi_base#wechat_redirect`;
    return res.status(200).json({ success: true, oauthUrl });
  }

  // 没有配置中转域名，直接使用原始地址
  const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=snsapi_base#wechat_redirect`;

  return res.status(200).json({ success: true, oauthUrl });
}

// 授权回调中转处理
async function handleOAuthCallback(req: VercelRequest, res: VercelResponse) {
  const { code, target } = req.query;

  if (!code || !target || typeof code !== 'string' || typeof target !== 'string') {
    return res.status(400).send('参数错误');
  }

  // 将 code 传递给目标地址
  const targetUrl = new URL(target);
  targetUrl.searchParams.set('code', code);

  // 302 重定向到目标地址
  return res.redirect(302, targetUrl.toString());
}

// 获取 OpenID
async function getOpenId(code: string): Promise<string> {
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.errcode) {
    throw new Error(`获取openid失败: ${data.errmsg}`);
  }

  return data.openid;
}

// JSAPI支付 - 微信内支付
async function handleJSAPIPayment(req: VercelRequest, res: VercelResponse) {
  const { visitorId, code } = req.body;

  if (!visitorId || !code) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  try {
    // 获取 openid
    const openId = await getOpenId(code);

    const outTradeNo = generateOutTradeNo();
    const requestBody = {
      appid: WECHAT_APPID,
      mchid: WECHAT_MCHID,
      description: PAYMENT_DESCRIPTION,
      out_trade_no: outTradeNo,
      notify_url: getNotifyUrl(),
      amount: {
        total: PAYMENT_AMOUNT,
        currency: 'CNY'
      },
      payer: {
        openid: openId
      }
    };

    const url = '/v3/pay/transactions/jsapi';
    const body = JSON.stringify(requestBody);
    const authorization = buildAuthHeader('POST', url, body);

    const response = await fetch('https://api.mch.weixin.qq.com' + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body,
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('微信JSAPI支付API错误:', data);
      return res.status(500).json({ error: '创建支付订单失败', detail: data.message });
    }

    // 保存订单到数据库
    await prisma.order.create({
      data: {
        visitorId,
        outTradeNo,
        amount: PAYMENT_AMOUNT,
        status: 'PENDING',
        paymentMethod: 'WECHAT_JSAPI',
        openId,
      }
    });

    // 生成前端调起支付的参数
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = generateNonceStr();
    const packageStr = `prepay_id=${data.prepay_id}`;
    const paySign = generateJSAPISign(WECHAT_APPID, timeStamp, nonceStr, packageStr);

    return res.status(200).json({
      success: true,
      outTradeNo,
      appId: WECHAT_APPID,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign,
    });
  } catch (error) {
    console.error('创建JSAPI支付失败:', error);
    return res.status(500).json({ error: '支付服务异常', detail: (error as Error).message });
  }
}

// 查询支付状态
async function handleQuery(req: VercelRequest, res: VercelResponse) {
  const { outTradeNo } = req.query;

  if (!outTradeNo || typeof outTradeNo !== 'string') {
    return res.status(400).json({ error: '缺少订单号' });
  }

  try {
    // 先查数据库
    const order = await prisma.order.findUnique({
      where: { outTradeNo }
    });

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 如果已支付，直接返回
    if (order.status === 'PAID') {
      return res.status(200).json({
        success: true,
        status: 'PAID',
        paidAt: order.paidAt,
      });
    }

    // 查询微信支付状态
    const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${WECHAT_MCHID}`;
    const authorization = buildAuthHeader('GET', url, '');

    const response = await fetch('https://api.mch.weixin.qq.com' + url, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
      },
    });

    const data = await response.json() as any;

    if (data.trade_state === 'SUCCESS') {
      // 更新订单状态
      await prisma.order.update({
        where: { outTradeNo },
        data: {
          status: 'PAID',
          transactionId: data.transaction_id,
          paidAt: new Date(),
        }
      });

      return res.status(200).json({
        success: true,
        status: 'PAID',
        transactionId: data.transaction_id,
      });
    }

    return res.status(200).json({
      success: true,
      status: data.trade_state || order.status,
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    return res.status(500).json({ error: '查询失败' });
  }
}

// 支付回调通知
async function handleNotify(req: VercelRequest, res: VercelResponse) {
  try {
    const { resource } = req.body;

    if (!resource) {
      return res.status(400).json({ code: 'FAIL', message: '无效的回调数据' });
    }

    // 解密回调数据
    let decryptedData;
    try {
      decryptedData = decryptNotifyData(
        resource.ciphertext,
        resource.nonce,
        resource.associated_data
      );
    } catch (e) {
      console.error('解密回调数据失败:', e);
      return res.status(400).json({ code: 'FAIL', message: '解密失败' });
    }

    const { out_trade_no, transaction_id, trade_state } = decryptedData;

    if (trade_state === 'SUCCESS') {
      // 更新订单状态
      await prisma.order.update({
        where: { outTradeNo: out_trade_no },
        data: {
          status: 'PAID',
          transactionId: transaction_id,
          paidAt: new Date(),
        }
      });
    }

    return res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
}

// 验证兑换码（复用现有逻辑）
async function handleCodePayment(req: VercelRequest, res: VercelResponse) {
  const { code, visitorId } = req.body;

  if (!code || !visitorId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  try {
    const redemptionCode = await prisma.redemptionCode.findUnique({
      where: { code }
    });

    if (!redemptionCode) {
      return res.status(400).json({ success: false, message: '兑换码不存在' });
    }

    if (redemptionCode.status === 'ACTIVATED' || redemptionCode.status === 'USED') {
      return res.status(400).json({ success: false, message: '兑换码已被使用' });
    }

    if (redemptionCode.status === 'REVOKED') {
      return res.status(400).json({ success: false, message: '兑换码已被撤销' });
    }

    if (redemptionCode.expiresAt && new Date(redemptionCode.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: '兑换码已过期' });
    }

    // 激活兑换码
    await prisma.redemptionCode.update({
      where: { code },
      data: {
        status: 'ACTIVATED',
        activatedAt: new Date(),
        userId: visitorId,
      }
    });

    // 创建一个兑换码支付记录
    const outTradeNo = generateOutTradeNo();
    await prisma.order.create({
      data: {
        visitorId,
        outTradeNo,
        amount: 0,
        status: 'PAID',
        paymentMethod: 'CODE',
        paidAt: new Date(),
      }
    });

    return res.status(200).json({
      success: true,
      message: '兑换码验证成功',
      outTradeNo,
    });
  } catch (error) {
    console.error('验证兑换码失败:', error);
    return res.status(500).json({ error: '验证失败' });
  }
}

// 检查用户是否已支付
async function handleCheckPaid(req: VercelRequest, res: VercelResponse) {
  const { visitorId } = req.query;

  if (!visitorId || typeof visitorId !== 'string') {
    return res.status(400).json({ error: '缺少用户标识' });
  }

  try {
    // 查找该用户最近的已支付订单
    const order = await prisma.order.findFirst({
      where: {
        visitorId,
        status: 'PAID',
      },
      orderBy: {
        paidAt: 'desc'
      }
    });

    if (order) {
      return res.status(200).json({
        success: true,
        paid: true,
        outTradeNo: order.outTradeNo,
        paymentMethod: order.paymentMethod,
      });
    }

    return res.status(200).json({
      success: true,
      paid: false,
    });
  } catch (error) {
    console.error('检查支付状态失败:', error);
    return res.status(500).json({ error: '检查失败' });
  }
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }

  // Apply CORS headers
  applyCors(req, res);

  const { action } = req.query;

  try {
    switch (action) {
      case 'native':
        if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
        return handleNativePayment(req, res);

      case 'jsapi':
        if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
        return handleJSAPIPayment(req, res);

      case 'oauth':
        if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
        return handleOAuth(req, res);

      case 'oauth-callback':
        if (req.method !== 'GET') return res.status(405).json({ error: '方法不允许' });
        return handleOAuthCallback(req, res);

      case 'query':
        if (req.method !== 'GET') return res.status(405).json({ error: '方法不允许' });
        return handleQuery(req, res);

      case 'notify':
        if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
        return handleNotify(req, res);

      case 'code':
        if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
        return handleCodePayment(req, res);

      case 'check':
        if (req.method !== 'GET') return res.status(405).json({ error: '方法不允许' });
        return handleCheckPaid(req, res);

      default:
        return res.status(400).json({ error: '无效的操作' });
    }
  } catch (error) {
    console.error('支付API错误:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}
