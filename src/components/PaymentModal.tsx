import React, { useState, useEffect, useCallback } from 'react';

interface PaymentModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: (outTradeNo: string) => void;
  visitorId: string;
}

type PaymentMethod = 'wechat' | 'code';
type PaymentStatus = 'idle' | 'creating' | 'pending' | 'polling' | 'success' | 'failed';

// 判断是否在微信内
const isWechat = () => /micromessenger/i.test(navigator.userAgent);

// 判断是否是移动端
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const PaymentModal: React.FC<PaymentModalProps> = ({ show, onClose, onSuccess, visitorId }) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [outTradeNo, setOutTradeNo] = useState<string>('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>('');
  const [pollingCount, setPollingCount] = useState(0);

  // 重置状态
  const resetState = useCallback(() => {
    setStatus('idle');
    setQrCodeUrl('');
    setOutTradeNo('');
    setCode('');
    setError('');
    setPollingCount(0);
  }, []);

  // 关闭时重置
  useEffect(() => {
    if (!show) {
      resetState();
    }
  }, [show, resetState]);

  // 创建微信支付订单
  const createWechatPayment = async () => {
    setStatus('creating');
    setError('');

    try {
      // 检查是否在微信内
      if (isWechat()) {
        // JSAPI支付流程
        const urlParams = new URLSearchParams(window.location.search);
        const wxCode = urlParams.get('code');

        if (!wxCode) {
          // 需要先获取微信授权
          const redirectUrl = window.location.href.split('?')[0];
          const response = await fetch('/api/payment?action=oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ redirectUrl }),
          });
          const data = await response.json();
          if (data.oauthUrl) {
            window.location.href = data.oauthUrl;
            return;
          }
        } else {
          // 有code，创建JSAPI支付
          const response = await fetch('/api/payment?action=jsapi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId, code: wxCode }),
          });
          const data = await response.json();

          if (data.success) {
            setOutTradeNo(data.outTradeNo);
            // 调起微信支付
            if (typeof WeixinJSBridge !== 'undefined') {
              WeixinJSBridge.invoke('getBrandWCPayRequest', {
                appId: data.appId,
                timeStamp: data.timeStamp,
                nonceStr: data.nonceStr,
                package: data.package,
                signType: data.signType,
                paySign: data.paySign,
              }, (res: any) => {
                if (res.err_msg === 'get_brand_wcpay_request:ok') {
                  setStatus('success');
                  onSuccess(data.outTradeNo);
                } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
                  setStatus('idle');
                  setError('支付已取消');
                } else {
                  setStatus('failed');
                  setError('支付失败，请重试');
                }
              });
            }
          } else {
            setStatus('failed');
            setError(data.error || '创建支付失败');
          }
        }
      } else {
        // Native支付（扫码）
        const response = await fetch('/api/payment?action=native', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
        });
        const data = await response.json();

        if (data.success) {
          setOutTradeNo(data.outTradeNo);
          // 使用第三方API生成二维码图片
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.codeUrl)}`;
          setQrCodeUrl(qrUrl);
          setStatus('pending');
          // 开始轮询支付状态
          startPolling(data.outTradeNo);
        } else {
          setStatus('failed');
          setError(data.error || '创建支付失败');
        }
      }
    } catch (err) {
      console.error('创建支付失败:', err);
      setStatus('failed');
      setError('网络错误，请重试');
    }
  };

  // 轮询支付状态
  const startPolling = (tradeNo: string) => {
    setStatus('polling');
    let count = 0;
    const maxCount = 120; // 最多轮询2分钟

    const poll = async () => {
      if (count >= maxCount) {
        setStatus('failed');
        setError('支付超时，请重新扫码');
        return;
      }

      try {
        const response = await fetch(`/api/payment?action=query&outTradeNo=${tradeNo}`);
        const data = await response.json();

        if (data.status === 'PAID') {
          setStatus('success');
          onSuccess(tradeNo);
          return;
        }

        count++;
        setPollingCount(count);
        setTimeout(poll, 1000);
      } catch (err) {
        count++;
        setPollingCount(count);
        setTimeout(poll, 1000);
      }
    };

    poll();
  };

  // 兑换码验证
  const handleCodeSubmit = async () => {
    if (!code.trim()) {
      setError('请输入兑换码');
      return;
    }

    setStatus('creating');
    setError('');

    try {
      const response = await fetch('/api/payment?action=code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), visitorId }),
      });
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        onSuccess(data.outTradeNo);
      } else {
        setStatus('idle');
        setError(data.message || '兑换码无效');
      }
    } catch (err) {
      setStatus('idle');
      setError('网络错误，请重试');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">解锁完整报告</h3>
          <p className="text-slate-500 text-sm">
            支付后即可查看 AI 深度分析报告
          </p>
        </div>

        {/* 价格展示 */}
        <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-2xl p-4 mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-slate-400 text-sm">¥</span>
            <span className="text-4xl font-black text-orange-600">1.9</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">限时优惠价</p>
        </div>

        {/* 支付方式选择 */}
        {status === 'idle' && (
          <>
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setPaymentMethod('wechat')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'wechat'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                </svg>
                <span className="font-bold text-sm">微信支付</span>
              </button>
              <button
                onClick={() => setPaymentMethod('code')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'code'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span className="font-bold text-sm">兑换码</span>
              </button>
            </div>

            {/* 微信支付 */}
            {paymentMethod === 'wechat' && (
              <button
                onClick={createWechatPayment}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-200"
              >
                {isWechat() ? '立即支付' : isMobile() ? '生成支付二维码' : '生成支付二维码'}
              </button>
            )}

            {/* 兑换码 */}
            {paymentMethod === 'code' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="请输入兑换码"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none text-center font-mono text-lg tracking-widest"
                  maxLength={20}
                />
                <button
                  onClick={handleCodeSubmit}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-rose-600 transition-all shadow-lg shadow-orange-200"
                >
                  验证兑换码
                </button>
              </div>
            )}
          </>
        )}

        {/* 创建中 */}
        {status === 'creating' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">正在处理...</p>
          </div>
        )}

        {/* 二维码展示 */}
        {(status === 'pending' || status === 'polling') && qrCodeUrl && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 inline-block mb-4">
              <img src={qrCodeUrl} alt="支付二维码" className="w-48 h-48" />
            </div>
            <p className="text-slate-600 text-sm mb-2">请使用微信扫码支付</p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>等待支付中... ({pollingCount}s)</span>
            </div>
            <button
              onClick={resetState}
              className="mt-4 text-sm text-slate-500 hover:text-orange-600"
            >
              取消支付
            </button>
          </div>
        )}

        {/* 支付成功 */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-slate-900 mb-2">支付成功！</p>
            <p className="text-slate-500 text-sm">正在生成您的专属报告...</p>
          </div>
        )}

        {/* 支付失败 */}
        {status === 'failed' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-bold text-slate-900 mb-2">支付失败</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button
              onClick={resetState}
              className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
            >
              重新支付
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {error && status === 'idle' && (
          <p className="text-red-500 text-sm text-center mt-4">{error}</p>
        )}

        {/* 关闭按钮 */}
        {(status === 'idle' || status === 'failed') && (
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-slate-500 font-medium hover:text-slate-700 transition-colors"
          >
            稍后再说
          </button>
        )}

        {/* 底部说明 */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            支付即表示同意 <a href="/terms" className="text-orange-600 hover:underline">用户协议</a> 和 <a href="/privacy" className="text-orange-600 hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// 声明微信JS Bridge类型
declare global {
  interface Window {
    WeixinJSBridge: any;
  }
}
declare const WeixinJSBridge: any;

export default PaymentModal;
