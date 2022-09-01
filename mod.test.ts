import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.153.0/testing/asserts.ts";

Deno.test("hello, world", () =>
  runProgram('echo "hello, world"', "hello, world\n"));

Deno.test("arithmetic", () => runProgram("echo $((5 + 5 * 3))", "20\n"));

Deno.test("program name", () => runProgram("echo $0", /.+\.sh\n/));

async function runProgram(
  program: string,
  expectedOutput: string | RegExp,
): Promise<void> {
  const filename = Deno.makeTempFileSync({ suffix: ".sh" });
  Deno.writeTextFileSync(filename, program);
  const process = Deno.run({
    cmd: ["deno", "run", "--allow-read", "mod.ts", filename],
    stdout: "piped",
  });
  const binaryOut = await process.output();
  process.close();
  const output = new TextDecoder().decode(binaryOut);

  if (expectedOutput instanceof RegExp) {
    assert(
      expectedOutput.test(output),
      `Expected to match: '${expectedOutput}', but was '${output}'`,
    );
  } else {
    assertEquals(output, expectedOutput);
  }
}
