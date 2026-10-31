import type { MetadataRoute } from 'next';
export default function robots():MetadataRoute.Robots {
  return {
    rules:{userAgent:'*',allow:'/',disallow:[
      '/api/','/dashboard/','/profile/','/payment/',
      '/login','/signup','/otp','/forgot','/biodata/',
    ]},
    sitemap:'https://niqaha.com/sitemap.xml',
    host:'https://niqaha.com',
  };
}
