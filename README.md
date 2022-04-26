# Stream Response
Fetch API `Response` objects made from async generators. Build streaming HTML responses or SSE with JS sugar.

Example:

```js
async function* generate() {
  for await (const row of iterAllRows()) {
    yield `${row.join(',')}\n`
  }
}

router.get('/large.csv', () => new StreamResponse(generate(), { 
  headers: [['content-type', 'text/csv']] 
}))
```

Creating a SSE endpoint works much the same way:

```js
async function* sse() {
  while (true) {
    await new Promise(r => setTimeout(r, 1000));
    yield 'data: hello\n\n';
  }
}

router.get('/sse', contentType(['text/event-stream']), (req, { type }) => {
  return new StreamResponse(sse(), { headers: [['content-type', type]] })
})
```


*[SSE]: Server Sent Events