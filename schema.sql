
-- 成长阻碍探测器 - 数据库初始化脚本

-- 1. 兑换码表
CREATE TABLE IF NOT EXISTS redemption_codes (
    code VARCHAR(20) PRIMARY KEY, -- 格式如 GROW2025
    package_type VARCHAR(20) DEFAULT 'STANDARD', -- STANDARD, PREMIUM, ENTERPRISE
    status VARCHAR(20) DEFAULT 'UNUSED', -- UNUSED, ACTIVATED, EXPIRED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    user_id VARCHAR(50) -- 关联使用的用户标识
);

-- 2. 测评记录表
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    redemption_code VARCHAR(20) REFERENCES redemption_codes(code),
    responses JSONB NOT NULL, -- 存储所有题目原始回答
    scores JSONB NOT NULL, -- 存储计算后的维度分、指数等
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. 进度保存表 (用于断点续答)
CREATE TABLE IF NOT EXISTS progress (
    user_id VARCHAR(50) PRIMARY KEY,
    current_page INT DEFAULT 0,
    responses JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初始测试数据
INSERT INTO redemption_codes (code, package_type, status) 
VALUES ('GROW2025', 'PREMIUM', 'UNUSED')
ON CONFLICT DO NOTHING;
