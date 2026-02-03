import { HttpsProxyAgent } from 'https-proxy-agent';

// 创建代理 agent（如果配置了代理）
export function createProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    console.log(`Using proxy: ${proxyUrl}`);
    return new HttpsProxyAgent(proxyUrl);
  }
  return undefined;
}
