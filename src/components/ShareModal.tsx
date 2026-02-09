import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface ShareModalProps {
  show: boolean;
  onClose: () => void;
  reportData: {
    totalScore: number;
    level: string;
    levelEmoji: string;
    topDimension: string;
    assessmentId?: string;
    dimensionScores?: Record<string, number>;
  };
}

/**
 * 分享功能组件 - 优化版
 */
export const ShareModal: React.FC<ShareModalProps> = ({ show, onClose, reportData }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);

  // 生成二维码
  useEffect(() => {
    const generateQR = async () => {
      const url = window.location.origin;
      try {
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 80,
          margin: 1,
          color: {
            dark: '#f97316',
            light: '#ffffff',
          },
        });
        setQrCodeUrl(qrDataUrl);
      } catch (err) {
        console.error('生成二维码失败:', err);
      }
    };
    if (show) {
      generateQR();
    }
  }, [show]);

  if (!show) return null;

  // 获取分数对应的描述文案
  const getScoreDescription = (score: number) => {
    if (score <= 30) return '能量充沛，状态极佳！';
    if (score <= 50) return '偶尔内耗，整体可控';
    if (score <= 70) return '内耗明显，需要关注';
    if (score <= 85) return '严重内耗，急需调整';
    return '能量告急，请立即行动';
  };

  // 获取挑战文案
  const getChallengeText = (score: number) => {
    if (score <= 30) return '你是怎么做到的？快来挑战我！';
    if (score <= 50) return '我还行，你敢来比比吗？';
    if (score <= 70) return '我需要充电了，你呢？';
    return '救救我！你的内耗指数是多少？';
  };

  const generateShareImage = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imageUrl = canvas.toDataURL('image/png');
      setShareImage(imageUrl);
    } catch (error) {
      console.error('生成分享图片失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!shareImage) return;

    const link = document.createElement('a');
    link.download = `内耗指数测评-${reportData.totalScore}分.png`;
    link.href = shareImage;
    link.click();
  };

  const copyLink = async () => {
    const shareUrl = reportData.assessmentId
      ? `${window.location.origin}/report/${reportData.assessmentId}`
      : window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('链接已复制到剪贴板');
    } catch (error) {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert('链接已复制到剪贴板');
    }
  };

  const shareToWeChat = () => {
    alert('请截图或保存图片后分享到微信');
  };

  const shareToWeibo = () => {
    const text = `我的内耗指数是 ${reportData.totalScore} 分，属于「${reportData.level}」${reportData.levelEmoji}，最大的能量黑洞是「${reportData.topDimension}」。${getChallengeText(reportData.totalScore)}`;
    const url = window.location.origin;
    const weiboUrl = `https://service.weibo.com/share/share.php?title=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(weiboUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
        {/* 头部 */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-3xl z-10">
          <h3 className="text-lg font-black text-slate-900">分享测评结果</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 分享卡片预览 - 优化设计 */}
        <div className="p-6">
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%)' }}
          >
            {/* 顶部渐变区域 */}
            <div
              className="px-6 pt-6 pb-8 text-center relative"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' }}
            >
              {/* 装饰元素 */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-4 relative z-10">
                <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-sm">内耗指数测评</span>
              </div>

              {/* 大标题 */}
              <h2 className="text-white text-xl font-black mb-2 relative z-10">
                {getChallengeText(reportData.totalScore)}
              </h2>

              {/* 分数展示 */}
              <div className="relative z-10 mt-4">
                <div className="text-7xl font-black text-white drop-shadow-lg">
                  {reportData.totalScore}
                  <span className="text-2xl opacity-80 ml-1">分</span>
                </div>
                <div className="mt-2 text-white/90 font-bold text-lg">
                  {reportData.levelEmoji} {reportData.level}
                </div>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="px-6 py-5">
              {/* 状态描述 */}
              <div className="text-center mb-4">
                <p className="text-slate-600 font-medium text-sm">
                  {getScoreDescription(reportData.totalScore)}
                </p>
              </div>

              {/* 最大能量黑洞 */}
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 font-bold mb-1">🕳️ 最大能量黑洞</div>
                    <div className="text-lg font-black text-orange-600">{reportData.topDimension}</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-rose-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                </div>
              </div>

              {/* 维度得分条 */}
              {reportData.dimensionScores && (
                <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-orange-100">
                  <div className="text-xs text-slate-400 font-bold mb-3">📊 四维内耗分布</div>
                  <div className="space-y-3">
                    {Object.entries(reportData.dimensionScores).map(([name, score]) => {
                      const percent = Math.round(Number(score) * 20);
                      return (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-600 w-16 shrink-0">{name}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percent}%`,
                                background: 'linear-gradient(90deg, #f97316 0%, #ec4899 100%)'
                              }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-orange-600 w-8 text-right">{Math.round(Number(score) * 10)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 底部：二维码和文案 */}
              <div className="flex items-center justify-between pt-3 border-t border-orange-100">
                <div className="flex-1">
                  <p className="text-xs font-bold text-orange-600 mb-1">
                    🔥 你的内耗指数是多少？
                  </p>
                  <p className="text-[10px] text-slate-400">
                    扫码测测，找出你的能量黑洞
                  </p>
                </div>
                {qrCodeUrl && (
                  <div className="w-16 h-16 bg-white rounded-lg p-1 shadow-sm border border-orange-100">
                    <img src={qrCodeUrl} alt="二维码" className="w-full h-full" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 生成图片按钮 */}
          {!shareImage && (
            <button
              onClick={generateShareImage}
              disabled={isGenerating}
              className="w-full mt-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isGenerating ? '生成中...' : '生成分享图片'}
            </button>
          )}

          {/* 图片预览和下载 */}
          {shareImage && (
            <div className="mt-4 space-y-3">
              <img src={shareImage} alt="分享图片" className="w-full rounded-xl border border-slate-200" />
              <button
                onClick={downloadImage}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                保存图片到相册
              </button>
            </div>
          )}
        </div>

        {/* 分享方式 */}
        <div className="px-6 pb-6">
          <div className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider">分享到</div>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={shareToWeChat}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-2.036 2.96c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">微信</span>
            </button>

            <button
              onClick={shareToWeibo}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.194.573zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.579-.18-.405-.649.381-1.017.422-1.896-.003-2.521-.8-1.178-2.989-1.115-5.506-.032 0 0-.788.345-.587-.281.39-1.236.332-2.27-.276-2.868-1.381-1.357-5.053.128-8.202 3.311C1.118 10.271 0 12.153 0 13.828c0 3.201 4.108 5.148 8.126 5.148 5.273 0 8.782-3.063 8.782-5.496 0-1.471-1.239-2.305-2.819-2.831zm4.863-6.136c-.345-.346-.346-.906 0-1.252.346-.346.907-.346 1.252 0 1.381 1.381 2.141 3.217 2.141 5.172 0 1.955-.76 3.791-2.141 5.172-.173.173-.399.259-.626.259-.226 0-.453-.086-.626-.259-.346-.346-.346-.907 0-1.252 1.035-1.035 1.604-2.412 1.604-3.879 0-1.466-.569-2.843-1.604-3.961zm-1.96 1.96c-.345-.346-.345-.906 0-1.252.346-.346.907-.346 1.252 0 .69.69 1.07 1.608 1.07 2.585 0 .977-.38 1.895-1.07 2.585-.173.173-.399.259-.626.259-.226 0-.453-.086-.626-.259-.346-.346-.346-.907 0-1.252.344-.345.534-.803.534-1.333 0-.53-.19-.988-.534-1.333z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">微博</span>
            </button>

            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">复制链接</span>
            </button>

            <button
              onClick={downloadImage}
              disabled={!shareImage}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <span className="text-xs text-slate-600 font-medium">保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 用户反馈组件
 */
interface FeedbackModalProps {
  show: boolean;
  onClose: () => void;
  assessmentId?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ show, onClose, assessmentId }) => {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!show) return null;

  const handleSubmit = async () => {
    console.log('Feedback submitted:', { rating, feedback, assessmentId });
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setRating(0);
      setFeedback('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 p-6">
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🙏</div>
            <h3 className="text-xl font-black text-slate-900 mb-2">感谢您的反馈！</h3>
            <p className="text-slate-500 text-sm">您的意见对我们非常重要</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">您的反馈</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="text-sm font-bold text-slate-700 mb-3 block">报告准确度</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-transform hover:scale-110 ${
                      star <= rating ? 'text-yellow-400' : 'text-slate-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-bold text-slate-700 mb-3 block">其他建议（可选）</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="告诉我们您的想法..."
                className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none text-sm"
                maxLength={500}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交反馈
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default { ShareModal, FeedbackModal };
