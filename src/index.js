'use strict';

const {parse} = require('url');

module.exports = (options = {}) => {
  const logger = getLogger(options)

  return function * (next) {
    const headers = this.req.headers
    const url = this.req.url
    const method = this.req.method
    const skip = `Not rewriting ${method} ${url}`

    if (method !== 'GET') {
      logger(`${skip} because the method is not GET.`)

      yield * next
    } else if (!headers || typeof headers.accept !== 'string') {
      logger(`${skip} because the client did not send an HTTP accept header.`)

      yield * next
    } else if (headers.accept.indexOf('application/json') === 0) {
      logger(`${skip} because the client prefers JSON.`)

      yield * next
    } else if (!acceptsHtml(headers.accept)) {
      logger(`${skip} because the client does not accept HTML.`)

      yield * next
    }

    const parsedUrl = parse(url)
    let rewriteTarget

    options.rewrites = options.rewrites || []

    for (const rewrite of options.rewrites) {
      const match = parsedUrl.pathname.match(rewrite.from)

      if (match !== null) {
        rewriteTarget = evaluateRewriteRule(parsedUrl, match, rewrite.to)
        logger(`Rewriting ${method} ${url} to ${rewriteTarget}`)
        this.req.url = rewriteTarget
        yield * next
      }
    }

    if (parsedUrl.pathname.includes('.')) {
      logger(`${skip} because the path includes a dot (.) character.`)

      yield * next
    }

    rewriteTarget = options.index || '/index.html'
    logger(`Rewriting ${method} ${url} to ${rewriteTarget}`)
    this.req.url = rewriteTarget

    yield * next
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
