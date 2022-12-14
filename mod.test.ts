import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.153.0/testing/asserts.ts";

Deno.test("hello, world", () =>
  runProgram('echo "hello, world"', "hello, world\n"));

Deno.test("arithmetic", () => runProgram("echo $((5 + 5 * 3))", "20\n"));

Deno.test("program name", () => runProgram("echo $0", /.+\.sh\n/));

Deno.test("arguments", () =>
  runProgram("echo $1 $2", "foo bar\n", ["foo", "bar"]));

Deno.test("if condition", () =>
  runProgram(
    `
a=4
if [ 5 -gt $a ]; then
  echo yes
else
  echo no
fi`,
    "yes\n",
  ));

Deno.test("comments", () =>
  runProgram(
    `
# foo
echo yes # bar
# echo no
echo "# test"
`,
    "yes\n# test\n",
  ));

Deno.test("command invocation", () =>
  runProgram(`awk 'BEGIN{print "foo"}'`, "foo\n"));

async function runProgram(
  program: string,
  expectedOutput: string | RegExp,
  args: string[] = [],
): Promise<void> {
  const filename = Deno.makeTempFileSync({ suffix: ".sh" });
  Deno.writeTextFileSync(filename, program);
  const process = Deno.run({
    cmd: [
      "deno",
      "run",
      "--allow-read",
      "--allow-run",
      "mod.ts",
      filename,
      ...args,
    ],
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
