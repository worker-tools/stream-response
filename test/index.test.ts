import 'https://gist.githubusercontent.com/qwtel/b14f0f81e3a96189f7771f83ee113f64/raw/TestRequest.ts'
import {
  assert,
  assertExists,
  assertEquals,
  assertStrictEquals,
  assertStringIncludes,
  assertThrows,
  assertRejects,
  assertArrayIncludes,
} from 'https://deno.land/std@0.133.0/testing/asserts.ts'
const { test } = Deno;

import { StreamResponse } from '../index.ts'

test('exists', () => {
  assertExists(StreamResponse)
})

function* iterAllRows() {
  for (let i = 0; i < 3; i++) {
    yield [i, i, i]
  }
}

async function* generateCSV() {
  for await (const row of iterAllRows()) {
    yield `${row.join(',')}\n`
    await timeout(10)
  }
}

test('generate', async () => {
  const res = new StreamResponse(generateCSV(), { headers: [['content-type', 'text/csv']] })
  assertEquals(res.headers.get('content-type'), 'text/csv')
  assertEquals(await res.text(), `0,0,0\n1,1,1\n2,2,2\n`)
})

const timeout = (n: number) => new Promise(r => setTimeout(r, n))

test('generate II', async () => {
  const res = new StreamResponse(generateCSV(), { headers: [['content-type', 'text/csv']] })
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader()
  assertEquals((await reader.read()).value, `0,0,0\n`)
  assertEquals((await reader.read()).value, `1,1,1\n`)
  assertEquals((await reader.read()).value, `2,2,2\n`)
  assertEquals((await reader.read()).done, true)
})