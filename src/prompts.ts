import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  select,
  text,
  type Option,
} from "@clack/prompts";
import { stdin, stdout } from "node:process";

export type PromptOption<Value extends string> = Option<Value>;

export interface Prompter {
  intro(title: string): void;
  outro(message?: string): void;
  info(message: string): void;
  note(message: string, title?: string): void;
  ask(question: string, defaultValue?: string): Promise<string>;
  confirm(message: string, initialValue?: boolean): Promise<boolean>;
  chooseOne<Value extends string>(
    message: string,
    options: PromptOption<Value>[],
    initialValue?: Value,
  ): Promise<Value>;
  chooseMany<Value extends string>(
    message: string,
    options: PromptOption<Value>[],
    initialValues?: Value[],
  ): Promise<Value[]>;
  close(): void;
}

export function createPrompter(): Prompter {
  const common = { input: stdin, output: stdout };

  return {
    intro(title) {
      intro(title, common);
    },
    outro(message) {
      outro(message, common);
    },
    info(message) {
      log.info(message, common);
    },
    note(message, title) {
      note(message, title, common);
    },
    async ask(question, defaultValue) {
      const value = await text({
        message: question,
        defaultValue: defaultValue || undefined,
        ...common,
      });
      return unwrap(value);
    },
    async confirm(message, initialValue) {
      const value = await confirm({
        message,
        initialValue,
        ...common,
      });
      return unwrap(value);
    },
    async chooseOne(message, options, initialValue) {
      const value = await select({
        message,
        options,
        initialValue,
        ...common,
      });
      return unwrap(value);
    },
    async chooseMany(message, options, initialValues) {
      const value = await multiselect({
        message,
        options,
        initialValues,
        required: false,
        ...common,
      });
      return unwrap(value);
    },
    close() {},
  };
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
  return value;
}
