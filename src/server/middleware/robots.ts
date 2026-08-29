import { Request, Response, NextFunction } from 'express';

/**
 * Middleware ensuring no search engines or web crawlers index any page or endpoint of this site.
 */
export function antiRobotMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
}

/**
 * Express handler serving custom robots.txt
 */
export function robotsTxtHandler(req: Request, res: Response) {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /\n');
}
