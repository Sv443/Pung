import * as Errors from "../common/data/errors.json";

declare type ErrorsObj = typeof Errors;

export type ErrCodes = keyof ErrorsObj;
