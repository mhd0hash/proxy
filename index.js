// index.js (در ریشه ریپازیتوری)

import { NextResponse } from 'next/server';

// **مهم:** این URL باید در تنظیمات Vercel به عنوان Environment Variable با نام TARGET_URL تعریف شود.
// در حال حاضر یک مقدار پیش‌فرض قرار داده شده است.
const TARGET_URL = process.env.TARGET_URL || 'https://example.com';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    // برای ارسال مسیر دلخواه به سرور مقصد، از کوئری پارامتر 'path' استفاده کنید.
    // مثال: /?path=/users/profile
    const targetPath = url.searchParams.get('path') || '/';
    const absoluteTargetUrl = new URL(targetPath, TARGET_URL).toString();

    // برای ارسال هدرهای لازم و همچنین مدیریت کوکی‌ها، این بخش را اضافه کنید:
    const headers = new Headers(request.headers);
    // هدر Host باید به URL مقصد تغییر کند
    headers.set('Host', new URL(TARGET_URL).host);
    // هدرهای مربوط به Vercel را حذف کنید تا باعث تداخل نشوند
    headers.delete('x-vercel-id');
    headers.delete('x-vercel-sc');
    headers.delete('x-forwarded-host');
    headers.delete('x-forwarded-proto');
    headers.delete('x-real-ip');


    const response = await fetch(absoluteTargetUrl, {
      method: request.method,
      headers: headers, // استفاده از هدرهای اصلاح شده
      body: request.body,
      redirect: 'manual', // مدیریت دستی ریدایرکت‌ها
    });

    // مدیریت ریدایرکت‌ها
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        // اگر ریدایرکت به یک URL نسبی بود، آن را به URL اصلی پروکسی اضافه کنید.
        const absoluteRedirectUrl = new URL(redirectUrl, absoluteTargetUrl).toString();
        return NextResponse.redirect(absoluteRedirectUrl, { status: response.status });
      }
    }

    // ایجاد پاسخ جدید با هدرهای اصلی (به جز هدرهای مربوط به انتقال)
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*'); // اجازه دسترسی از هر مبدا (در صورت نیاز)

    // اگر محتوا HTML است، متن آن را برگردانید.
    // برای فایل‌های دیگر (مثل تصاویر، CSS، JS)، آن‌ها را به صورت Blob برگردانید.
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let text = await response.text();
      // در اینجا می‌توانید متن HTML را در صورت نیاز تغییر دهید.
      // مثال: جایگزینی لینک‌ها برای کار در محیط پروکسی
      // text = text.replace(/href="\//g, `href="/?path=`);
      // text = text.replace(/src="\//g, `src="/?path=`);
      return new Response(text, {
        status: response.status,
        headers: responseHeaders,
      });
    } else {
      const blob = await response.blob();
      return new Response(blob, {
        status: response.status,
        headers: responseHeaders,
      });
    }
  } catch (error) {
    console.error('Proxy Error:', error);
    // در صورت بروز خطا، پیام مناسب برگردانده شود.
    return NextResponse.json({ error: 'Failed to proxy request', details: error.message }, { status: 500 });
  }
}

// برای متدهای دیگر HTTP (POST, PUT, DELETE, etc.) می‌توانید توابع مشابهی اضافه کنید.
// export async function POST(request) { ... }
