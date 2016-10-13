'use strict';

const {parse} = require('url');

export default (options = {}) => {
  const logger = getLogger(options)

  return async (ctx, next) => {
    const headers = ctx.req.headers
    const url = ctx.req.url
    const method = ctx.req.method
    const skip = `Not rewriting ${method} ${url}`

    if (method !== 'GET') {
      logger(`${skip} because the method is not GET.`)

      return await next()
    } else if (!headers || typeof headers.accept !== 'string') {
      logger(`${skip} because the client did not send an HTTP accept header.`)

      return await next()
    } else if (headers.accept.indexOf('application/json') === 0) {
      logger(`${skip} because the client prefers JSON.`)

      return await next()
    } else if (!acceptsHtml(headers.accept)) {
      logger(`${skip} because the client does not accept HTML.`)

      return await next()
    }

    const parsedUrl = parse(url)
    let rewriteTarget

    options.rewrites = options.rewrites || []

    for (const rewrite of options.rewrites) {
      const match = parsedUrl.pathname.match(rewrite.from)

      if (match !== null) {
        rewriteTarget = evaluateRewriteRule(parsedUrl, match, rewrite.to)
        logger(`Rewriting ${method} ${url} to ${rewriteTarget}`)
        ctx.req.url = rewriteTarget
        return await next()
      }
    }

    if (parsedUrl.pathname.includes('.')) {
      logger(`${skip} because the path includes a dot (.) character.`)

      return await next()
    }

    rewriteTarget = options.index || '/index.html'
    logger(`Rewriting ${method} ${url} to ${rewriteTarget}`)
    ctx.req.url = rewriteTarget

    return await next()
  };
};

function evaluateRewriteRule(parsedUrl, match, rule) {
  if (typeof rule === 'string') {
    return rule;
  } else if (typeof rule !== 'function') {
    throw new Error('Rewrite rule can only be of type string of function.');
  }

  return rule({ parsedUrl, match });
}

function acceptsHtml(header = '') {
  return header.includes('text/html') || header.includes('*/*')
}

function getLogger(options = {}) {
  if (options.logger) {
    return options.logger
  } else if (options.verbose) {
    return console.log.bind(console)
  } else {
    return () => {}
  }
}
