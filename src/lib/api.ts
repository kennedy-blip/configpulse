import type { Diff, Environment, Entry, Matrix } from '../types';

const sample: Matrix = {
  development: [
    {key:'DATABASE_URL',value:'postgresql://localhost:5432/app_dev',type:'url',secret:true,required:true,updatedAt:''},
    {key:'REDIS_URL',value:'redis://localhost:6379',type:'url',secret:true,required:true,updatedAt:''},
    {key:'JWT_SECRET',value:'dev-only-change-me',type:'string',secret:true,required:true,updatedAt:''},
    {key:'NEXT_PUBLIC_API_BASE',value:'http://localhost:3000/api',type:'url',secret:false,required:true,updatedAt:''},
    {key:'RATE_LIMIT_MAX',value:'100',type:'number',secret:false,required:true,updatedAt:''},
    {key:'FEATURE_BETA',value:'true',type:'boolean',secret:false,required:false,updatedAt:''}
  ],
  staging: [
    {key:'DATABASE_URL',value:'postgresql://staging.internal:5432/app',type:'url',secret:true,required:true,updatedAt:''},
    {key:'REDIS_URL',value:'redis://staging.internal:6379',type:'url',secret:true,required:true,updatedAt:''},
    {key:'JWT_SECRET',value:'staging-secret-placeholder',type:'string',secret:true,required:true,updatedAt:''},
    {key:'NEXT_PUBLIC_API_BASE',value:'https://staging-api.example.com',type:'url',secret:false,required:true,updatedAt:''},
    {key:'RATE_LIMIT_MAX',value:'80',type:'number',secret:false,required:true,updatedAt:''}
  ],
  production: [
    {key:'DATABASE_URL',value:'postgresql://prod.internal:5432/app',type:'url',secret:true,required:true,updatedAt:''},
    {key:'JWT_SECRET',value:'production-secret-placeholder',type:'string',secret:true,required:true,updatedAt:''},
    {key:'NEXT_PUBLIC_API_BASE',value:'https://api.example.com',type:'url',secret:false,required:true,updatedAt:''},
    {key:'RATE_LIMIT_MAX',value:'200',type:'number',secret:false,required:true,updatedAt:''}
  ]
};
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed');
  return response.json();
}
export async function loadConfigs(): Promise<Matrix> {
  try { return (await request<{environments: Matrix}>('/api/configs')).environments; }
  catch { return sample; }
}
export async function saveConfig(environment: Environment, entry: Entry) {
  return request<{environments: Matrix}>('/api/configs', { method: 'POST', body: JSON.stringify({ environment, ...entry }) });
}
export async function removeConfig(environment: Environment, key: string) {
  return request<{environments: Matrix}>('/api/configs', { method: 'DELETE', body: JSON.stringify({ environment, key }) });
}
export async function runDiff(sourceEnv: Environment, targetEnv: Environment) {
  return request<Diff>('/api/diff', { method: 'POST', body: JSON.stringify({ sourceEnv, targetEnv }) });
}