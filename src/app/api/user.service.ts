import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class XsrfInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.headers.has('X-XSRF-TOKEN')) {
      const xsrfToken = req.headers.get('X-XSRF-TOKEN');
      // Only modify the request if the token is actually present
      if (xsrfToken) {
        const modifiedReq = req.clone({
          headers: req.headers.set('X-XSRF-TOKEN', xsrfToken.toLowerCase())
        });
        return next.handle(modifiedReq);
      }
    }
    // Proceed with the original request if no token is present
    return next.handle(req);
  }
}