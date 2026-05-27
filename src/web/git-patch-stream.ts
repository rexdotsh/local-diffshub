const GIT_FILE_BOUNDARY = "diff --git ";
const NON_WHITESPACE_PATTERN = /\S/;

export type GitPatchFileStreamParser = {
  finish(): string | undefined;
  push(chunk: string): void;
  takeAvailableFile(): string | undefined;
};

export function createGitPatchFileStreamParser(): GitPatchFileStreamParser {
  let pendingLine = "";
  let pendingMetadata = "";
  let currentFile = "";
  const availableFiles: string[] = [];

  const queueCurrentFile = () => {
    if (NON_WHITESPACE_PATTERN.test(currentFile)) {
      availableFiles.push(currentFile);
    }
    currentFile = "";
  };

  const processLine = (line: string) => {
    if (line.startsWith(GIT_FILE_BOUNDARY)) {
      queueCurrentFile();
      currentFile = `${pendingMetadata}${line}`;
      pendingMetadata = "";
      return;
    }

    if (currentFile.length > 0) {
      currentFile += line;
      return;
    }

    pendingMetadata += line;
  };

  return {
    push(chunk) {
      pendingLine += chunk;
      let newlineIndex = pendingLine.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = pendingLine.slice(0, newlineIndex + 1);
        pendingLine = pendingLine.slice(newlineIndex + 1);
        processLine(line);
        newlineIndex = pendingLine.indexOf("\n");
      }
    },
    takeAvailableFile() {
      return availableFiles.shift();
    },
    finish() {
      if (pendingLine.length > 0) {
        processLine(pendingLine);
        pendingLine = "";
      }
      queueCurrentFile();
      return availableFiles.shift();
    },
  };
}
