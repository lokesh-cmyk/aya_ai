
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model WhatsAppSession
 * 
 */
export type WhatsAppSession = $Result.DefaultSelection<Prisma.$WhatsAppSessionPayload>
/**
 * Model WhatsAppAuth
 * 
 */
export type WhatsAppAuth = $Result.DefaultSelection<Prisma.$WhatsAppAuthPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.whatsAppSession`: Exposes CRUD operations for the **WhatsAppSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more WhatsAppSessions
    * const whatsAppSessions = await prisma.whatsAppSession.findMany()
    * ```
    */
  get whatsAppSession(): Prisma.WhatsAppSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.whatsAppAuth`: Exposes CRUD operations for the **WhatsAppAuth** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more WhatsAppAuths
    * const whatsAppAuths = await prisma.whatsAppAuth.findMany()
    * ```
    */
  get whatsAppAuth(): Prisma.WhatsAppAuthDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.4.1
   * Query Engine version: 55ae170b1ced7fc6ed07a15f110549408c501bb3
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    WhatsAppSession: 'WhatsAppSession',
    WhatsAppAuth: 'WhatsAppAuth'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "whatsAppSession" | "whatsAppAuth"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      WhatsAppSession: {
        payload: Prisma.$WhatsAppSessionPayload<ExtArgs>
        fields: Prisma.WhatsAppSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WhatsAppSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WhatsAppSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>
          }
          findFirst: {
            args: Prisma.WhatsAppSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WhatsAppSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>
          }
          findMany: {
            args: Prisma.WhatsAppSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>[]
          }
          create: {
            args: Prisma.WhatsAppSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>
          }
          createMany: {
            args: Prisma.WhatsAppSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WhatsAppSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>[]
          }
          delete: {
            args: Prisma.WhatsAppSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>
          }
          update: {
            args: Prisma.WhatsAppSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>
          }
          deleteMany: {
            args: Prisma.WhatsAppSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WhatsAppSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WhatsAppSessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>[]
          }
          upsert: {
            args: Prisma.WhatsAppSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppSessionPayload>
          }
          aggregate: {
            args: Prisma.WhatsAppSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWhatsAppSession>
          }
          groupBy: {
            args: Prisma.WhatsAppSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<WhatsAppSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.WhatsAppSessionCountArgs<ExtArgs>
            result: $Utils.Optional<WhatsAppSessionCountAggregateOutputType> | number
          }
        }
      }
      WhatsAppAuth: {
        payload: Prisma.$WhatsAppAuthPayload<ExtArgs>
        fields: Prisma.WhatsAppAuthFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WhatsAppAuthFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WhatsAppAuthFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>
          }
          findFirst: {
            args: Prisma.WhatsAppAuthFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WhatsAppAuthFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>
          }
          findMany: {
            args: Prisma.WhatsAppAuthFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>[]
          }
          create: {
            args: Prisma.WhatsAppAuthCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>
          }
          createMany: {
            args: Prisma.WhatsAppAuthCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WhatsAppAuthCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>[]
          }
          delete: {
            args: Prisma.WhatsAppAuthDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>
          }
          update: {
            args: Prisma.WhatsAppAuthUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>
          }
          deleteMany: {
            args: Prisma.WhatsAppAuthDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WhatsAppAuthUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WhatsAppAuthUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>[]
          }
          upsert: {
            args: Prisma.WhatsAppAuthUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WhatsAppAuthPayload>
          }
          aggregate: {
            args: Prisma.WhatsAppAuthAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWhatsAppAuth>
          }
          groupBy: {
            args: Prisma.WhatsAppAuthGroupByArgs<ExtArgs>
            result: $Utils.Optional<WhatsAppAuthGroupByOutputType>[]
          }
          count: {
            args: Prisma.WhatsAppAuthCountArgs<ExtArgs>
            result: $Utils.Optional<WhatsAppAuthCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    whatsAppSession?: WhatsAppSessionOmit
    whatsAppAuth?: WhatsAppAuthOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    whatsappSessions: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    whatsappSessions?: boolean | UserCountOutputTypeCountWhatsappSessionsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountWhatsappSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WhatsAppSessionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    name: string | null
    whatsappPhone: string | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    name: string | null
    whatsappPhone: string | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    name: number
    whatsappPhone: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    name?: true
    whatsappPhone?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    name?: true
    whatsappPhone?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    name?: true
    whatsappPhone?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    name: string
    whatsappPhone: string | null
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    whatsappPhone?: boolean
    whatsappSessions?: boolean | User$whatsappSessionsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    whatsappPhone?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    whatsappPhone?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    name?: boolean
    whatsappPhone?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "name" | "whatsappPhone", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    whatsappSessions?: boolean | User$whatsappSessionsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      whatsappSessions: Prisma.$WhatsAppSessionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      name: string
      whatsappPhone: string | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    whatsappSessions<T extends User$whatsappSessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$whatsappSessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly whatsappPhone: FieldRef<"User", 'String'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.whatsappSessions
   */
  export type User$whatsappSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    where?: WhatsAppSessionWhereInput
    orderBy?: WhatsAppSessionOrderByWithRelationInput | WhatsAppSessionOrderByWithRelationInput[]
    cursor?: WhatsAppSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WhatsAppSessionScalarFieldEnum | WhatsAppSessionScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model WhatsAppSession
   */

  export type AggregateWhatsAppSession = {
    _count: WhatsAppSessionCountAggregateOutputType | null
    _avg: WhatsAppSessionAvgAggregateOutputType | null
    _sum: WhatsAppSessionSumAggregateOutputType | null
    _min: WhatsAppSessionMinAggregateOutputType | null
    _max: WhatsAppSessionMaxAggregateOutputType | null
  }

  export type WhatsAppSessionAvgAggregateOutputType = {
    slot: number | null
  }

  export type WhatsAppSessionSumAggregateOutputType = {
    slot: number | null
  }

  export type WhatsAppSessionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    slot: number | null
    phone: string | null
    displayName: string | null
    profilePicUrl: string | null
    status: string | null
    lastSeen: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WhatsAppSessionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    slot: number | null
    phone: string | null
    displayName: string | null
    profilePicUrl: string | null
    status: string | null
    lastSeen: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WhatsAppSessionCountAggregateOutputType = {
    id: number
    userId: number
    slot: number
    phone: number
    displayName: number
    profilePicUrl: number
    status: number
    lastSeen: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type WhatsAppSessionAvgAggregateInputType = {
    slot?: true
  }

  export type WhatsAppSessionSumAggregateInputType = {
    slot?: true
  }

  export type WhatsAppSessionMinAggregateInputType = {
    id?: true
    userId?: true
    slot?: true
    phone?: true
    displayName?: true
    profilePicUrl?: true
    status?: true
    lastSeen?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WhatsAppSessionMaxAggregateInputType = {
    id?: true
    userId?: true
    slot?: true
    phone?: true
    displayName?: true
    profilePicUrl?: true
    status?: true
    lastSeen?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WhatsAppSessionCountAggregateInputType = {
    id?: true
    userId?: true
    slot?: true
    phone?: true
    displayName?: true
    profilePicUrl?: true
    status?: true
    lastSeen?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type WhatsAppSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WhatsAppSession to aggregate.
     */
    where?: WhatsAppSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppSessions to fetch.
     */
    orderBy?: WhatsAppSessionOrderByWithRelationInput | WhatsAppSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WhatsAppSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned WhatsAppSessions
    **/
    _count?: true | WhatsAppSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WhatsAppSessionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WhatsAppSessionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WhatsAppSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WhatsAppSessionMaxAggregateInputType
  }

  export type GetWhatsAppSessionAggregateType<T extends WhatsAppSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateWhatsAppSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWhatsAppSession[P]>
      : GetScalarType<T[P], AggregateWhatsAppSession[P]>
  }




  export type WhatsAppSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WhatsAppSessionWhereInput
    orderBy?: WhatsAppSessionOrderByWithAggregationInput | WhatsAppSessionOrderByWithAggregationInput[]
    by: WhatsAppSessionScalarFieldEnum[] | WhatsAppSessionScalarFieldEnum
    having?: WhatsAppSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WhatsAppSessionCountAggregateInputType | true
    _avg?: WhatsAppSessionAvgAggregateInputType
    _sum?: WhatsAppSessionSumAggregateInputType
    _min?: WhatsAppSessionMinAggregateInputType
    _max?: WhatsAppSessionMaxAggregateInputType
  }

  export type WhatsAppSessionGroupByOutputType = {
    id: string
    userId: string
    slot: number
    phone: string | null
    displayName: string | null
    profilePicUrl: string | null
    status: string
    lastSeen: Date | null
    createdAt: Date
    updatedAt: Date
    _count: WhatsAppSessionCountAggregateOutputType | null
    _avg: WhatsAppSessionAvgAggregateOutputType | null
    _sum: WhatsAppSessionSumAggregateOutputType | null
    _min: WhatsAppSessionMinAggregateOutputType | null
    _max: WhatsAppSessionMaxAggregateOutputType | null
  }

  type GetWhatsAppSessionGroupByPayload<T extends WhatsAppSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WhatsAppSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WhatsAppSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WhatsAppSessionGroupByOutputType[P]>
            : GetScalarType<T[P], WhatsAppSessionGroupByOutputType[P]>
        }
      >
    >


  export type WhatsAppSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    slot?: boolean
    phone?: boolean
    displayName?: boolean
    profilePicUrl?: boolean
    status?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["whatsAppSession"]>

  export type WhatsAppSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    slot?: boolean
    phone?: boolean
    displayName?: boolean
    profilePicUrl?: boolean
    status?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["whatsAppSession"]>

  export type WhatsAppSessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    slot?: boolean
    phone?: boolean
    displayName?: boolean
    profilePicUrl?: boolean
    status?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["whatsAppSession"]>

  export type WhatsAppSessionSelectScalar = {
    id?: boolean
    userId?: boolean
    slot?: boolean
    phone?: boolean
    displayName?: boolean
    profilePicUrl?: boolean
    status?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type WhatsAppSessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "slot" | "phone" | "displayName" | "profilePicUrl" | "status" | "lastSeen" | "createdAt" | "updatedAt", ExtArgs["result"]["whatsAppSession"]>
  export type WhatsAppSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type WhatsAppSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type WhatsAppSessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $WhatsAppSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "WhatsAppSession"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      slot: number
      phone: string | null
      displayName: string | null
      profilePicUrl: string | null
      status: string
      lastSeen: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["whatsAppSession"]>
    composites: {}
  }

  type WhatsAppSessionGetPayload<S extends boolean | null | undefined | WhatsAppSessionDefaultArgs> = $Result.GetResult<Prisma.$WhatsAppSessionPayload, S>

  type WhatsAppSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WhatsAppSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WhatsAppSessionCountAggregateInputType | true
    }

  export interface WhatsAppSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['WhatsAppSession'], meta: { name: 'WhatsAppSession' } }
    /**
     * Find zero or one WhatsAppSession that matches the filter.
     * @param {WhatsAppSessionFindUniqueArgs} args - Arguments to find a WhatsAppSession
     * @example
     * // Get one WhatsAppSession
     * const whatsAppSession = await prisma.whatsAppSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WhatsAppSessionFindUniqueArgs>(args: SelectSubset<T, WhatsAppSessionFindUniqueArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one WhatsAppSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WhatsAppSessionFindUniqueOrThrowArgs} args - Arguments to find a WhatsAppSession
     * @example
     * // Get one WhatsAppSession
     * const whatsAppSession = await prisma.whatsAppSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WhatsAppSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, WhatsAppSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WhatsAppSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppSessionFindFirstArgs} args - Arguments to find a WhatsAppSession
     * @example
     * // Get one WhatsAppSession
     * const whatsAppSession = await prisma.whatsAppSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WhatsAppSessionFindFirstArgs>(args?: SelectSubset<T, WhatsAppSessionFindFirstArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WhatsAppSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppSessionFindFirstOrThrowArgs} args - Arguments to find a WhatsAppSession
     * @example
     * // Get one WhatsAppSession
     * const whatsAppSession = await prisma.whatsAppSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WhatsAppSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, WhatsAppSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more WhatsAppSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all WhatsAppSessions
     * const whatsAppSessions = await prisma.whatsAppSession.findMany()
     * 
     * // Get first 10 WhatsAppSessions
     * const whatsAppSessions = await prisma.whatsAppSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const whatsAppSessionWithIdOnly = await prisma.whatsAppSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WhatsAppSessionFindManyArgs>(args?: SelectSubset<T, WhatsAppSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a WhatsAppSession.
     * @param {WhatsAppSessionCreateArgs} args - Arguments to create a WhatsAppSession.
     * @example
     * // Create one WhatsAppSession
     * const WhatsAppSession = await prisma.whatsAppSession.create({
     *   data: {
     *     // ... data to create a WhatsAppSession
     *   }
     * })
     * 
     */
    create<T extends WhatsAppSessionCreateArgs>(args: SelectSubset<T, WhatsAppSessionCreateArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many WhatsAppSessions.
     * @param {WhatsAppSessionCreateManyArgs} args - Arguments to create many WhatsAppSessions.
     * @example
     * // Create many WhatsAppSessions
     * const whatsAppSession = await prisma.whatsAppSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WhatsAppSessionCreateManyArgs>(args?: SelectSubset<T, WhatsAppSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many WhatsAppSessions and returns the data saved in the database.
     * @param {WhatsAppSessionCreateManyAndReturnArgs} args - Arguments to create many WhatsAppSessions.
     * @example
     * // Create many WhatsAppSessions
     * const whatsAppSession = await prisma.whatsAppSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many WhatsAppSessions and only return the `id`
     * const whatsAppSessionWithIdOnly = await prisma.whatsAppSession.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WhatsAppSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, WhatsAppSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a WhatsAppSession.
     * @param {WhatsAppSessionDeleteArgs} args - Arguments to delete one WhatsAppSession.
     * @example
     * // Delete one WhatsAppSession
     * const WhatsAppSession = await prisma.whatsAppSession.delete({
     *   where: {
     *     // ... filter to delete one WhatsAppSession
     *   }
     * })
     * 
     */
    delete<T extends WhatsAppSessionDeleteArgs>(args: SelectSubset<T, WhatsAppSessionDeleteArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one WhatsAppSession.
     * @param {WhatsAppSessionUpdateArgs} args - Arguments to update one WhatsAppSession.
     * @example
     * // Update one WhatsAppSession
     * const whatsAppSession = await prisma.whatsAppSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WhatsAppSessionUpdateArgs>(args: SelectSubset<T, WhatsAppSessionUpdateArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more WhatsAppSessions.
     * @param {WhatsAppSessionDeleteManyArgs} args - Arguments to filter WhatsAppSessions to delete.
     * @example
     * // Delete a few WhatsAppSessions
     * const { count } = await prisma.whatsAppSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WhatsAppSessionDeleteManyArgs>(args?: SelectSubset<T, WhatsAppSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WhatsAppSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many WhatsAppSessions
     * const whatsAppSession = await prisma.whatsAppSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WhatsAppSessionUpdateManyArgs>(args: SelectSubset<T, WhatsAppSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WhatsAppSessions and returns the data updated in the database.
     * @param {WhatsAppSessionUpdateManyAndReturnArgs} args - Arguments to update many WhatsAppSessions.
     * @example
     * // Update many WhatsAppSessions
     * const whatsAppSession = await prisma.whatsAppSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more WhatsAppSessions and only return the `id`
     * const whatsAppSessionWithIdOnly = await prisma.whatsAppSession.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WhatsAppSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, WhatsAppSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one WhatsAppSession.
     * @param {WhatsAppSessionUpsertArgs} args - Arguments to update or create a WhatsAppSession.
     * @example
     * // Update or create a WhatsAppSession
     * const whatsAppSession = await prisma.whatsAppSession.upsert({
     *   create: {
     *     // ... data to create a WhatsAppSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the WhatsAppSession we want to update
     *   }
     * })
     */
    upsert<T extends WhatsAppSessionUpsertArgs>(args: SelectSubset<T, WhatsAppSessionUpsertArgs<ExtArgs>>): Prisma__WhatsAppSessionClient<$Result.GetResult<Prisma.$WhatsAppSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of WhatsAppSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppSessionCountArgs} args - Arguments to filter WhatsAppSessions to count.
     * @example
     * // Count the number of WhatsAppSessions
     * const count = await prisma.whatsAppSession.count({
     *   where: {
     *     // ... the filter for the WhatsAppSessions we want to count
     *   }
     * })
    **/
    count<T extends WhatsAppSessionCountArgs>(
      args?: Subset<T, WhatsAppSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WhatsAppSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a WhatsAppSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WhatsAppSessionAggregateArgs>(args: Subset<T, WhatsAppSessionAggregateArgs>): Prisma.PrismaPromise<GetWhatsAppSessionAggregateType<T>>

    /**
     * Group by WhatsAppSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WhatsAppSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WhatsAppSessionGroupByArgs['orderBy'] }
        : { orderBy?: WhatsAppSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WhatsAppSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWhatsAppSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the WhatsAppSession model
   */
  readonly fields: WhatsAppSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for WhatsAppSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WhatsAppSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the WhatsAppSession model
   */
  interface WhatsAppSessionFieldRefs {
    readonly id: FieldRef<"WhatsAppSession", 'String'>
    readonly userId: FieldRef<"WhatsAppSession", 'String'>
    readonly slot: FieldRef<"WhatsAppSession", 'Int'>
    readonly phone: FieldRef<"WhatsAppSession", 'String'>
    readonly displayName: FieldRef<"WhatsAppSession", 'String'>
    readonly profilePicUrl: FieldRef<"WhatsAppSession", 'String'>
    readonly status: FieldRef<"WhatsAppSession", 'String'>
    readonly lastSeen: FieldRef<"WhatsAppSession", 'DateTime'>
    readonly createdAt: FieldRef<"WhatsAppSession", 'DateTime'>
    readonly updatedAt: FieldRef<"WhatsAppSession", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * WhatsAppSession findUnique
   */
  export type WhatsAppSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * Filter, which WhatsAppSession to fetch.
     */
    where: WhatsAppSessionWhereUniqueInput
  }

  /**
   * WhatsAppSession findUniqueOrThrow
   */
  export type WhatsAppSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * Filter, which WhatsAppSession to fetch.
     */
    where: WhatsAppSessionWhereUniqueInput
  }

  /**
   * WhatsAppSession findFirst
   */
  export type WhatsAppSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * Filter, which WhatsAppSession to fetch.
     */
    where?: WhatsAppSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppSessions to fetch.
     */
    orderBy?: WhatsAppSessionOrderByWithRelationInput | WhatsAppSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WhatsAppSessions.
     */
    cursor?: WhatsAppSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WhatsAppSessions.
     */
    distinct?: WhatsAppSessionScalarFieldEnum | WhatsAppSessionScalarFieldEnum[]
  }

  /**
   * WhatsAppSession findFirstOrThrow
   */
  export type WhatsAppSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * Filter, which WhatsAppSession to fetch.
     */
    where?: WhatsAppSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppSessions to fetch.
     */
    orderBy?: WhatsAppSessionOrderByWithRelationInput | WhatsAppSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WhatsAppSessions.
     */
    cursor?: WhatsAppSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WhatsAppSessions.
     */
    distinct?: WhatsAppSessionScalarFieldEnum | WhatsAppSessionScalarFieldEnum[]
  }

  /**
   * WhatsAppSession findMany
   */
  export type WhatsAppSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * Filter, which WhatsAppSessions to fetch.
     */
    where?: WhatsAppSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppSessions to fetch.
     */
    orderBy?: WhatsAppSessionOrderByWithRelationInput | WhatsAppSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing WhatsAppSessions.
     */
    cursor?: WhatsAppSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppSessions.
     */
    skip?: number
    distinct?: WhatsAppSessionScalarFieldEnum | WhatsAppSessionScalarFieldEnum[]
  }

  /**
   * WhatsAppSession create
   */
  export type WhatsAppSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a WhatsAppSession.
     */
    data: XOR<WhatsAppSessionCreateInput, WhatsAppSessionUncheckedCreateInput>
  }

  /**
   * WhatsAppSession createMany
   */
  export type WhatsAppSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many WhatsAppSessions.
     */
    data: WhatsAppSessionCreateManyInput | WhatsAppSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * WhatsAppSession createManyAndReturn
   */
  export type WhatsAppSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * The data used to create many WhatsAppSessions.
     */
    data: WhatsAppSessionCreateManyInput | WhatsAppSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * WhatsAppSession update
   */
  export type WhatsAppSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a WhatsAppSession.
     */
    data: XOR<WhatsAppSessionUpdateInput, WhatsAppSessionUncheckedUpdateInput>
    /**
     * Choose, which WhatsAppSession to update.
     */
    where: WhatsAppSessionWhereUniqueInput
  }

  /**
   * WhatsAppSession updateMany
   */
  export type WhatsAppSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update WhatsAppSessions.
     */
    data: XOR<WhatsAppSessionUpdateManyMutationInput, WhatsAppSessionUncheckedUpdateManyInput>
    /**
     * Filter which WhatsAppSessions to update
     */
    where?: WhatsAppSessionWhereInput
    /**
     * Limit how many WhatsAppSessions to update.
     */
    limit?: number
  }

  /**
   * WhatsAppSession updateManyAndReturn
   */
  export type WhatsAppSessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * The data used to update WhatsAppSessions.
     */
    data: XOR<WhatsAppSessionUpdateManyMutationInput, WhatsAppSessionUncheckedUpdateManyInput>
    /**
     * Filter which WhatsAppSessions to update
     */
    where?: WhatsAppSessionWhereInput
    /**
     * Limit how many WhatsAppSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * WhatsAppSession upsert
   */
  export type WhatsAppSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the WhatsAppSession to update in case it exists.
     */
    where: WhatsAppSessionWhereUniqueInput
    /**
     * In case the WhatsAppSession found by the `where` argument doesn't exist, create a new WhatsAppSession with this data.
     */
    create: XOR<WhatsAppSessionCreateInput, WhatsAppSessionUncheckedCreateInput>
    /**
     * In case the WhatsAppSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WhatsAppSessionUpdateInput, WhatsAppSessionUncheckedUpdateInput>
  }

  /**
   * WhatsAppSession delete
   */
  export type WhatsAppSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
    /**
     * Filter which WhatsAppSession to delete.
     */
    where: WhatsAppSessionWhereUniqueInput
  }

  /**
   * WhatsAppSession deleteMany
   */
  export type WhatsAppSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WhatsAppSessions to delete
     */
    where?: WhatsAppSessionWhereInput
    /**
     * Limit how many WhatsAppSessions to delete.
     */
    limit?: number
  }

  /**
   * WhatsAppSession without action
   */
  export type WhatsAppSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppSession
     */
    select?: WhatsAppSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppSession
     */
    omit?: WhatsAppSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WhatsAppSessionInclude<ExtArgs> | null
  }


  /**
   * Model WhatsAppAuth
   */

  export type AggregateWhatsAppAuth = {
    _count: WhatsAppAuthCountAggregateOutputType | null
    _min: WhatsAppAuthMinAggregateOutputType | null
    _max: WhatsAppAuthMaxAggregateOutputType | null
  }

  export type WhatsAppAuthMinAggregateOutputType = {
    id: string | null
    updatedAt: Date | null
  }

  export type WhatsAppAuthMaxAggregateOutputType = {
    id: string | null
    updatedAt: Date | null
  }

  export type WhatsAppAuthCountAggregateOutputType = {
    id: number
    creds: number
    keys: number
    updatedAt: number
    _all: number
  }


  export type WhatsAppAuthMinAggregateInputType = {
    id?: true
    updatedAt?: true
  }

  export type WhatsAppAuthMaxAggregateInputType = {
    id?: true
    updatedAt?: true
  }

  export type WhatsAppAuthCountAggregateInputType = {
    id?: true
    creds?: true
    keys?: true
    updatedAt?: true
    _all?: true
  }

  export type WhatsAppAuthAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WhatsAppAuth to aggregate.
     */
    where?: WhatsAppAuthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppAuths to fetch.
     */
    orderBy?: WhatsAppAuthOrderByWithRelationInput | WhatsAppAuthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WhatsAppAuthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppAuths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppAuths.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned WhatsAppAuths
    **/
    _count?: true | WhatsAppAuthCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WhatsAppAuthMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WhatsAppAuthMaxAggregateInputType
  }

  export type GetWhatsAppAuthAggregateType<T extends WhatsAppAuthAggregateArgs> = {
        [P in keyof T & keyof AggregateWhatsAppAuth]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWhatsAppAuth[P]>
      : GetScalarType<T[P], AggregateWhatsAppAuth[P]>
  }




  export type WhatsAppAuthGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WhatsAppAuthWhereInput
    orderBy?: WhatsAppAuthOrderByWithAggregationInput | WhatsAppAuthOrderByWithAggregationInput[]
    by: WhatsAppAuthScalarFieldEnum[] | WhatsAppAuthScalarFieldEnum
    having?: WhatsAppAuthScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WhatsAppAuthCountAggregateInputType | true
    _min?: WhatsAppAuthMinAggregateInputType
    _max?: WhatsAppAuthMaxAggregateInputType
  }

  export type WhatsAppAuthGroupByOutputType = {
    id: string
    creds: JsonValue
    keys: JsonValue
    updatedAt: Date
    _count: WhatsAppAuthCountAggregateOutputType | null
    _min: WhatsAppAuthMinAggregateOutputType | null
    _max: WhatsAppAuthMaxAggregateOutputType | null
  }

  type GetWhatsAppAuthGroupByPayload<T extends WhatsAppAuthGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WhatsAppAuthGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WhatsAppAuthGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WhatsAppAuthGroupByOutputType[P]>
            : GetScalarType<T[P], WhatsAppAuthGroupByOutputType[P]>
        }
      >
    >


  export type WhatsAppAuthSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creds?: boolean
    keys?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["whatsAppAuth"]>

  export type WhatsAppAuthSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creds?: boolean
    keys?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["whatsAppAuth"]>

  export type WhatsAppAuthSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creds?: boolean
    keys?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["whatsAppAuth"]>

  export type WhatsAppAuthSelectScalar = {
    id?: boolean
    creds?: boolean
    keys?: boolean
    updatedAt?: boolean
  }

  export type WhatsAppAuthOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "creds" | "keys" | "updatedAt", ExtArgs["result"]["whatsAppAuth"]>

  export type $WhatsAppAuthPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "WhatsAppAuth"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      creds: Prisma.JsonValue
      keys: Prisma.JsonValue
      updatedAt: Date
    }, ExtArgs["result"]["whatsAppAuth"]>
    composites: {}
  }

  type WhatsAppAuthGetPayload<S extends boolean | null | undefined | WhatsAppAuthDefaultArgs> = $Result.GetResult<Prisma.$WhatsAppAuthPayload, S>

  type WhatsAppAuthCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WhatsAppAuthFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WhatsAppAuthCountAggregateInputType | true
    }

  export interface WhatsAppAuthDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['WhatsAppAuth'], meta: { name: 'WhatsAppAuth' } }
    /**
     * Find zero or one WhatsAppAuth that matches the filter.
     * @param {WhatsAppAuthFindUniqueArgs} args - Arguments to find a WhatsAppAuth
     * @example
     * // Get one WhatsAppAuth
     * const whatsAppAuth = await prisma.whatsAppAuth.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WhatsAppAuthFindUniqueArgs>(args: SelectSubset<T, WhatsAppAuthFindUniqueArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one WhatsAppAuth that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WhatsAppAuthFindUniqueOrThrowArgs} args - Arguments to find a WhatsAppAuth
     * @example
     * // Get one WhatsAppAuth
     * const whatsAppAuth = await prisma.whatsAppAuth.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WhatsAppAuthFindUniqueOrThrowArgs>(args: SelectSubset<T, WhatsAppAuthFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WhatsAppAuth that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppAuthFindFirstArgs} args - Arguments to find a WhatsAppAuth
     * @example
     * // Get one WhatsAppAuth
     * const whatsAppAuth = await prisma.whatsAppAuth.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WhatsAppAuthFindFirstArgs>(args?: SelectSubset<T, WhatsAppAuthFindFirstArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WhatsAppAuth that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppAuthFindFirstOrThrowArgs} args - Arguments to find a WhatsAppAuth
     * @example
     * // Get one WhatsAppAuth
     * const whatsAppAuth = await prisma.whatsAppAuth.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WhatsAppAuthFindFirstOrThrowArgs>(args?: SelectSubset<T, WhatsAppAuthFindFirstOrThrowArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more WhatsAppAuths that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppAuthFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all WhatsAppAuths
     * const whatsAppAuths = await prisma.whatsAppAuth.findMany()
     * 
     * // Get first 10 WhatsAppAuths
     * const whatsAppAuths = await prisma.whatsAppAuth.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const whatsAppAuthWithIdOnly = await prisma.whatsAppAuth.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WhatsAppAuthFindManyArgs>(args?: SelectSubset<T, WhatsAppAuthFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a WhatsAppAuth.
     * @param {WhatsAppAuthCreateArgs} args - Arguments to create a WhatsAppAuth.
     * @example
     * // Create one WhatsAppAuth
     * const WhatsAppAuth = await prisma.whatsAppAuth.create({
     *   data: {
     *     // ... data to create a WhatsAppAuth
     *   }
     * })
     * 
     */
    create<T extends WhatsAppAuthCreateArgs>(args: SelectSubset<T, WhatsAppAuthCreateArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many WhatsAppAuths.
     * @param {WhatsAppAuthCreateManyArgs} args - Arguments to create many WhatsAppAuths.
     * @example
     * // Create many WhatsAppAuths
     * const whatsAppAuth = await prisma.whatsAppAuth.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WhatsAppAuthCreateManyArgs>(args?: SelectSubset<T, WhatsAppAuthCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many WhatsAppAuths and returns the data saved in the database.
     * @param {WhatsAppAuthCreateManyAndReturnArgs} args - Arguments to create many WhatsAppAuths.
     * @example
     * // Create many WhatsAppAuths
     * const whatsAppAuth = await prisma.whatsAppAuth.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many WhatsAppAuths and only return the `id`
     * const whatsAppAuthWithIdOnly = await prisma.whatsAppAuth.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WhatsAppAuthCreateManyAndReturnArgs>(args?: SelectSubset<T, WhatsAppAuthCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a WhatsAppAuth.
     * @param {WhatsAppAuthDeleteArgs} args - Arguments to delete one WhatsAppAuth.
     * @example
     * // Delete one WhatsAppAuth
     * const WhatsAppAuth = await prisma.whatsAppAuth.delete({
     *   where: {
     *     // ... filter to delete one WhatsAppAuth
     *   }
     * })
     * 
     */
    delete<T extends WhatsAppAuthDeleteArgs>(args: SelectSubset<T, WhatsAppAuthDeleteArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one WhatsAppAuth.
     * @param {WhatsAppAuthUpdateArgs} args - Arguments to update one WhatsAppAuth.
     * @example
     * // Update one WhatsAppAuth
     * const whatsAppAuth = await prisma.whatsAppAuth.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WhatsAppAuthUpdateArgs>(args: SelectSubset<T, WhatsAppAuthUpdateArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more WhatsAppAuths.
     * @param {WhatsAppAuthDeleteManyArgs} args - Arguments to filter WhatsAppAuths to delete.
     * @example
     * // Delete a few WhatsAppAuths
     * const { count } = await prisma.whatsAppAuth.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WhatsAppAuthDeleteManyArgs>(args?: SelectSubset<T, WhatsAppAuthDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WhatsAppAuths.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppAuthUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many WhatsAppAuths
     * const whatsAppAuth = await prisma.whatsAppAuth.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WhatsAppAuthUpdateManyArgs>(args: SelectSubset<T, WhatsAppAuthUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WhatsAppAuths and returns the data updated in the database.
     * @param {WhatsAppAuthUpdateManyAndReturnArgs} args - Arguments to update many WhatsAppAuths.
     * @example
     * // Update many WhatsAppAuths
     * const whatsAppAuth = await prisma.whatsAppAuth.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more WhatsAppAuths and only return the `id`
     * const whatsAppAuthWithIdOnly = await prisma.whatsAppAuth.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WhatsAppAuthUpdateManyAndReturnArgs>(args: SelectSubset<T, WhatsAppAuthUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one WhatsAppAuth.
     * @param {WhatsAppAuthUpsertArgs} args - Arguments to update or create a WhatsAppAuth.
     * @example
     * // Update or create a WhatsAppAuth
     * const whatsAppAuth = await prisma.whatsAppAuth.upsert({
     *   create: {
     *     // ... data to create a WhatsAppAuth
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the WhatsAppAuth we want to update
     *   }
     * })
     */
    upsert<T extends WhatsAppAuthUpsertArgs>(args: SelectSubset<T, WhatsAppAuthUpsertArgs<ExtArgs>>): Prisma__WhatsAppAuthClient<$Result.GetResult<Prisma.$WhatsAppAuthPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of WhatsAppAuths.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppAuthCountArgs} args - Arguments to filter WhatsAppAuths to count.
     * @example
     * // Count the number of WhatsAppAuths
     * const count = await prisma.whatsAppAuth.count({
     *   where: {
     *     // ... the filter for the WhatsAppAuths we want to count
     *   }
     * })
    **/
    count<T extends WhatsAppAuthCountArgs>(
      args?: Subset<T, WhatsAppAuthCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WhatsAppAuthCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a WhatsAppAuth.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppAuthAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WhatsAppAuthAggregateArgs>(args: Subset<T, WhatsAppAuthAggregateArgs>): Prisma.PrismaPromise<GetWhatsAppAuthAggregateType<T>>

    /**
     * Group by WhatsAppAuth.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhatsAppAuthGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WhatsAppAuthGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WhatsAppAuthGroupByArgs['orderBy'] }
        : { orderBy?: WhatsAppAuthGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WhatsAppAuthGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWhatsAppAuthGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the WhatsAppAuth model
   */
  readonly fields: WhatsAppAuthFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for WhatsAppAuth.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WhatsAppAuthClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the WhatsAppAuth model
   */
  interface WhatsAppAuthFieldRefs {
    readonly id: FieldRef<"WhatsAppAuth", 'String'>
    readonly creds: FieldRef<"WhatsAppAuth", 'Json'>
    readonly keys: FieldRef<"WhatsAppAuth", 'Json'>
    readonly updatedAt: FieldRef<"WhatsAppAuth", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * WhatsAppAuth findUnique
   */
  export type WhatsAppAuthFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * Filter, which WhatsAppAuth to fetch.
     */
    where: WhatsAppAuthWhereUniqueInput
  }

  /**
   * WhatsAppAuth findUniqueOrThrow
   */
  export type WhatsAppAuthFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * Filter, which WhatsAppAuth to fetch.
     */
    where: WhatsAppAuthWhereUniqueInput
  }

  /**
   * WhatsAppAuth findFirst
   */
  export type WhatsAppAuthFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * Filter, which WhatsAppAuth to fetch.
     */
    where?: WhatsAppAuthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppAuths to fetch.
     */
    orderBy?: WhatsAppAuthOrderByWithRelationInput | WhatsAppAuthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WhatsAppAuths.
     */
    cursor?: WhatsAppAuthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppAuths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppAuths.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WhatsAppAuths.
     */
    distinct?: WhatsAppAuthScalarFieldEnum | WhatsAppAuthScalarFieldEnum[]
  }

  /**
   * WhatsAppAuth findFirstOrThrow
   */
  export type WhatsAppAuthFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * Filter, which WhatsAppAuth to fetch.
     */
    where?: WhatsAppAuthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppAuths to fetch.
     */
    orderBy?: WhatsAppAuthOrderByWithRelationInput | WhatsAppAuthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WhatsAppAuths.
     */
    cursor?: WhatsAppAuthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppAuths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppAuths.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WhatsAppAuths.
     */
    distinct?: WhatsAppAuthScalarFieldEnum | WhatsAppAuthScalarFieldEnum[]
  }

  /**
   * WhatsAppAuth findMany
   */
  export type WhatsAppAuthFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * Filter, which WhatsAppAuths to fetch.
     */
    where?: WhatsAppAuthWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhatsAppAuths to fetch.
     */
    orderBy?: WhatsAppAuthOrderByWithRelationInput | WhatsAppAuthOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing WhatsAppAuths.
     */
    cursor?: WhatsAppAuthWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhatsAppAuths from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhatsAppAuths.
     */
    skip?: number
    distinct?: WhatsAppAuthScalarFieldEnum | WhatsAppAuthScalarFieldEnum[]
  }

  /**
   * WhatsAppAuth create
   */
  export type WhatsAppAuthCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * The data needed to create a WhatsAppAuth.
     */
    data: XOR<WhatsAppAuthCreateInput, WhatsAppAuthUncheckedCreateInput>
  }

  /**
   * WhatsAppAuth createMany
   */
  export type WhatsAppAuthCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many WhatsAppAuths.
     */
    data: WhatsAppAuthCreateManyInput | WhatsAppAuthCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * WhatsAppAuth createManyAndReturn
   */
  export type WhatsAppAuthCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * The data used to create many WhatsAppAuths.
     */
    data: WhatsAppAuthCreateManyInput | WhatsAppAuthCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * WhatsAppAuth update
   */
  export type WhatsAppAuthUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * The data needed to update a WhatsAppAuth.
     */
    data: XOR<WhatsAppAuthUpdateInput, WhatsAppAuthUncheckedUpdateInput>
    /**
     * Choose, which WhatsAppAuth to update.
     */
    where: WhatsAppAuthWhereUniqueInput
  }

  /**
   * WhatsAppAuth updateMany
   */
  export type WhatsAppAuthUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update WhatsAppAuths.
     */
    data: XOR<WhatsAppAuthUpdateManyMutationInput, WhatsAppAuthUncheckedUpdateManyInput>
    /**
     * Filter which WhatsAppAuths to update
     */
    where?: WhatsAppAuthWhereInput
    /**
     * Limit how many WhatsAppAuths to update.
     */
    limit?: number
  }

  /**
   * WhatsAppAuth updateManyAndReturn
   */
  export type WhatsAppAuthUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * The data used to update WhatsAppAuths.
     */
    data: XOR<WhatsAppAuthUpdateManyMutationInput, WhatsAppAuthUncheckedUpdateManyInput>
    /**
     * Filter which WhatsAppAuths to update
     */
    where?: WhatsAppAuthWhereInput
    /**
     * Limit how many WhatsAppAuths to update.
     */
    limit?: number
  }

  /**
   * WhatsAppAuth upsert
   */
  export type WhatsAppAuthUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * The filter to search for the WhatsAppAuth to update in case it exists.
     */
    where: WhatsAppAuthWhereUniqueInput
    /**
     * In case the WhatsAppAuth found by the `where` argument doesn't exist, create a new WhatsAppAuth with this data.
     */
    create: XOR<WhatsAppAuthCreateInput, WhatsAppAuthUncheckedCreateInput>
    /**
     * In case the WhatsAppAuth was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WhatsAppAuthUpdateInput, WhatsAppAuthUncheckedUpdateInput>
  }

  /**
   * WhatsAppAuth delete
   */
  export type WhatsAppAuthDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
    /**
     * Filter which WhatsAppAuth to delete.
     */
    where: WhatsAppAuthWhereUniqueInput
  }

  /**
   * WhatsAppAuth deleteMany
   */
  export type WhatsAppAuthDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WhatsAppAuths to delete
     */
    where?: WhatsAppAuthWhereInput
    /**
     * Limit how many WhatsAppAuths to delete.
     */
    limit?: number
  }

  /**
   * WhatsAppAuth without action
   */
  export type WhatsAppAuthDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhatsAppAuth
     */
    select?: WhatsAppAuthSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WhatsAppAuth
     */
    omit?: WhatsAppAuthOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    name: 'name',
    whatsappPhone: 'whatsappPhone'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const WhatsAppSessionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    slot: 'slot',
    phone: 'phone',
    displayName: 'displayName',
    profilePicUrl: 'profilePicUrl',
    status: 'status',
    lastSeen: 'lastSeen',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type WhatsAppSessionScalarFieldEnum = (typeof WhatsAppSessionScalarFieldEnum)[keyof typeof WhatsAppSessionScalarFieldEnum]


  export const WhatsAppAuthScalarFieldEnum: {
    id: 'id',
    creds: 'creds',
    keys: 'keys',
    updatedAt: 'updatedAt'
  };

  export type WhatsAppAuthScalarFieldEnum = (typeof WhatsAppAuthScalarFieldEnum)[keyof typeof WhatsAppAuthScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    whatsappPhone?: StringNullableFilter<"User"> | string | null
    whatsappSessions?: WhatsAppSessionListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    whatsappPhone?: SortOrderInput | SortOrder
    whatsappSessions?: WhatsAppSessionOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    whatsappPhone?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    whatsappSessions?: WhatsAppSessionListRelationFilter
  }, "id" | "email" | "whatsappPhone">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    whatsappPhone?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    whatsappPhone?: StringNullableWithAggregatesFilter<"User"> | string | null
  }

  export type WhatsAppSessionWhereInput = {
    AND?: WhatsAppSessionWhereInput | WhatsAppSessionWhereInput[]
    OR?: WhatsAppSessionWhereInput[]
    NOT?: WhatsAppSessionWhereInput | WhatsAppSessionWhereInput[]
    id?: StringFilter<"WhatsAppSession"> | string
    userId?: StringFilter<"WhatsAppSession"> | string
    slot?: IntFilter<"WhatsAppSession"> | number
    phone?: StringNullableFilter<"WhatsAppSession"> | string | null
    displayName?: StringNullableFilter<"WhatsAppSession"> | string | null
    profilePicUrl?: StringNullableFilter<"WhatsAppSession"> | string | null
    status?: StringFilter<"WhatsAppSession"> | string
    lastSeen?: DateTimeNullableFilter<"WhatsAppSession"> | Date | string | null
    createdAt?: DateTimeFilter<"WhatsAppSession"> | Date | string
    updatedAt?: DateTimeFilter<"WhatsAppSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type WhatsAppSessionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    slot?: SortOrder
    phone?: SortOrderInput | SortOrder
    displayName?: SortOrderInput | SortOrder
    profilePicUrl?: SortOrderInput | SortOrder
    status?: SortOrder
    lastSeen?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type WhatsAppSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    phone?: string
    userId_slot?: WhatsAppSessionUserIdSlotCompoundUniqueInput
    AND?: WhatsAppSessionWhereInput | WhatsAppSessionWhereInput[]
    OR?: WhatsAppSessionWhereInput[]
    NOT?: WhatsAppSessionWhereInput | WhatsAppSessionWhereInput[]
    userId?: StringFilter<"WhatsAppSession"> | string
    slot?: IntFilter<"WhatsAppSession"> | number
    displayName?: StringNullableFilter<"WhatsAppSession"> | string | null
    profilePicUrl?: StringNullableFilter<"WhatsAppSession"> | string | null
    status?: StringFilter<"WhatsAppSession"> | string
    lastSeen?: DateTimeNullableFilter<"WhatsAppSession"> | Date | string | null
    createdAt?: DateTimeFilter<"WhatsAppSession"> | Date | string
    updatedAt?: DateTimeFilter<"WhatsAppSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "userId_slot" | "phone">

  export type WhatsAppSessionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    slot?: SortOrder
    phone?: SortOrderInput | SortOrder
    displayName?: SortOrderInput | SortOrder
    profilePicUrl?: SortOrderInput | SortOrder
    status?: SortOrder
    lastSeen?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: WhatsAppSessionCountOrderByAggregateInput
    _avg?: WhatsAppSessionAvgOrderByAggregateInput
    _max?: WhatsAppSessionMaxOrderByAggregateInput
    _min?: WhatsAppSessionMinOrderByAggregateInput
    _sum?: WhatsAppSessionSumOrderByAggregateInput
  }

  export type WhatsAppSessionScalarWhereWithAggregatesInput = {
    AND?: WhatsAppSessionScalarWhereWithAggregatesInput | WhatsAppSessionScalarWhereWithAggregatesInput[]
    OR?: WhatsAppSessionScalarWhereWithAggregatesInput[]
    NOT?: WhatsAppSessionScalarWhereWithAggregatesInput | WhatsAppSessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"WhatsAppSession"> | string
    userId?: StringWithAggregatesFilter<"WhatsAppSession"> | string
    slot?: IntWithAggregatesFilter<"WhatsAppSession"> | number
    phone?: StringNullableWithAggregatesFilter<"WhatsAppSession"> | string | null
    displayName?: StringNullableWithAggregatesFilter<"WhatsAppSession"> | string | null
    profilePicUrl?: StringNullableWithAggregatesFilter<"WhatsAppSession"> | string | null
    status?: StringWithAggregatesFilter<"WhatsAppSession"> | string
    lastSeen?: DateTimeNullableWithAggregatesFilter<"WhatsAppSession"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"WhatsAppSession"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"WhatsAppSession"> | Date | string
  }

  export type WhatsAppAuthWhereInput = {
    AND?: WhatsAppAuthWhereInput | WhatsAppAuthWhereInput[]
    OR?: WhatsAppAuthWhereInput[]
    NOT?: WhatsAppAuthWhereInput | WhatsAppAuthWhereInput[]
    id?: StringFilter<"WhatsAppAuth"> | string
    creds?: JsonFilter<"WhatsAppAuth">
    keys?: JsonFilter<"WhatsAppAuth">
    updatedAt?: DateTimeFilter<"WhatsAppAuth"> | Date | string
  }

  export type WhatsAppAuthOrderByWithRelationInput = {
    id?: SortOrder
    creds?: SortOrder
    keys?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhatsAppAuthWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: WhatsAppAuthWhereInput | WhatsAppAuthWhereInput[]
    OR?: WhatsAppAuthWhereInput[]
    NOT?: WhatsAppAuthWhereInput | WhatsAppAuthWhereInput[]
    creds?: JsonFilter<"WhatsAppAuth">
    keys?: JsonFilter<"WhatsAppAuth">
    updatedAt?: DateTimeFilter<"WhatsAppAuth"> | Date | string
  }, "id">

  export type WhatsAppAuthOrderByWithAggregationInput = {
    id?: SortOrder
    creds?: SortOrder
    keys?: SortOrder
    updatedAt?: SortOrder
    _count?: WhatsAppAuthCountOrderByAggregateInput
    _max?: WhatsAppAuthMaxOrderByAggregateInput
    _min?: WhatsAppAuthMinOrderByAggregateInput
  }

  export type WhatsAppAuthScalarWhereWithAggregatesInput = {
    AND?: WhatsAppAuthScalarWhereWithAggregatesInput | WhatsAppAuthScalarWhereWithAggregatesInput[]
    OR?: WhatsAppAuthScalarWhereWithAggregatesInput[]
    NOT?: WhatsAppAuthScalarWhereWithAggregatesInput | WhatsAppAuthScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"WhatsAppAuth"> | string
    creds?: JsonWithAggregatesFilter<"WhatsAppAuth">
    keys?: JsonWithAggregatesFilter<"WhatsAppAuth">
    updatedAt?: DateTimeWithAggregatesFilter<"WhatsAppAuth"> | Date | string
  }

  export type UserCreateInput = {
    id: string
    email: string
    name: string
    whatsappPhone?: string | null
    whatsappSessions?: WhatsAppSessionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id: string
    email: string
    name: string
    whatsappPhone?: string | null
    whatsappSessions?: WhatsAppSessionUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    whatsappPhone?: NullableStringFieldUpdateOperationsInput | string | null
    whatsappSessions?: WhatsAppSessionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    whatsappPhone?: NullableStringFieldUpdateOperationsInput | string | null
    whatsappSessions?: WhatsAppSessionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id: string
    email: string
    name: string
    whatsappPhone?: string | null
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    whatsappPhone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    whatsappPhone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type WhatsAppSessionCreateInput = {
    id?: string
    slot: number
    phone?: string | null
    displayName?: string | null
    profilePicUrl?: string | null
    status?: string
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWhatsappSessionsInput
  }

  export type WhatsAppSessionUncheckedCreateInput = {
    id?: string
    userId: string
    slot: number
    phone?: string | null
    displayName?: string | null
    profilePicUrl?: string | null
    status?: string
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WhatsAppSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slot?: IntFieldUpdateOperationsInput | number
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicUrl?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWhatsappSessionsNestedInput
  }

  export type WhatsAppSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    slot?: IntFieldUpdateOperationsInput | number
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicUrl?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppSessionCreateManyInput = {
    id?: string
    userId: string
    slot: number
    phone?: string | null
    displayName?: string | null
    profilePicUrl?: string | null
    status?: string
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WhatsAppSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slot?: IntFieldUpdateOperationsInput | number
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicUrl?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    slot?: IntFieldUpdateOperationsInput | number
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicUrl?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppAuthCreateInput = {
    id: string
    creds: JsonNullValueInput | InputJsonValue
    keys: JsonNullValueInput | InputJsonValue
    updatedAt?: Date | string
  }

  export type WhatsAppAuthUncheckedCreateInput = {
    id: string
    creds: JsonNullValueInput | InputJsonValue
    keys: JsonNullValueInput | InputJsonValue
    updatedAt?: Date | string
  }

  export type WhatsAppAuthUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    creds?: JsonNullValueInput | InputJsonValue
    keys?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppAuthUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    creds?: JsonNullValueInput | InputJsonValue
    keys?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppAuthCreateManyInput = {
    id: string
    creds: JsonNullValueInput | InputJsonValue
    keys: JsonNullValueInput | InputJsonValue
    updatedAt?: Date | string
  }

  export type WhatsAppAuthUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    creds?: JsonNullValueInput | InputJsonValue
    keys?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppAuthUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    creds?: JsonNullValueInput | InputJsonValue
    keys?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type WhatsAppSessionListRelationFilter = {
    every?: WhatsAppSessionWhereInput
    some?: WhatsAppSessionWhereInput
    none?: WhatsAppSessionWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type WhatsAppSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    whatsappPhone?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    whatsappPhone?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    whatsappPhone?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type WhatsAppSessionUserIdSlotCompoundUniqueInput = {
    userId: string
    slot: number
  }

  export type WhatsAppSessionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    slot?: SortOrder
    phone?: SortOrder
    displayName?: SortOrder
    profilePicUrl?: SortOrder
    status?: SortOrder
    lastSeen?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhatsAppSessionAvgOrderByAggregateInput = {
    slot?: SortOrder
  }

  export type WhatsAppSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    slot?: SortOrder
    phone?: SortOrder
    displayName?: SortOrder
    profilePicUrl?: SortOrder
    status?: SortOrder
    lastSeen?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhatsAppSessionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    slot?: SortOrder
    phone?: SortOrder
    displayName?: SortOrder
    profilePicUrl?: SortOrder
    status?: SortOrder
    lastSeen?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhatsAppSessionSumOrderByAggregateInput = {
    slot?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type WhatsAppAuthCountOrderByAggregateInput = {
    id?: SortOrder
    creds?: SortOrder
    keys?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhatsAppAuthMaxOrderByAggregateInput = {
    id?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhatsAppAuthMinOrderByAggregateInput = {
    id?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type WhatsAppSessionCreateNestedManyWithoutUserInput = {
    create?: XOR<WhatsAppSessionCreateWithoutUserInput, WhatsAppSessionUncheckedCreateWithoutUserInput> | WhatsAppSessionCreateWithoutUserInput[] | WhatsAppSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WhatsAppSessionCreateOrConnectWithoutUserInput | WhatsAppSessionCreateOrConnectWithoutUserInput[]
    createMany?: WhatsAppSessionCreateManyUserInputEnvelope
    connect?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
  }

  export type WhatsAppSessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<WhatsAppSessionCreateWithoutUserInput, WhatsAppSessionUncheckedCreateWithoutUserInput> | WhatsAppSessionCreateWithoutUserInput[] | WhatsAppSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WhatsAppSessionCreateOrConnectWithoutUserInput | WhatsAppSessionCreateOrConnectWithoutUserInput[]
    createMany?: WhatsAppSessionCreateManyUserInputEnvelope
    connect?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type WhatsAppSessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<WhatsAppSessionCreateWithoutUserInput, WhatsAppSessionUncheckedCreateWithoutUserInput> | WhatsAppSessionCreateWithoutUserInput[] | WhatsAppSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WhatsAppSessionCreateOrConnectWithoutUserInput | WhatsAppSessionCreateOrConnectWithoutUserInput[]
    upsert?: WhatsAppSessionUpsertWithWhereUniqueWithoutUserInput | WhatsAppSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: WhatsAppSessionCreateManyUserInputEnvelope
    set?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    disconnect?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    delete?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    connect?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    update?: WhatsAppSessionUpdateWithWhereUniqueWithoutUserInput | WhatsAppSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: WhatsAppSessionUpdateManyWithWhereWithoutUserInput | WhatsAppSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: WhatsAppSessionScalarWhereInput | WhatsAppSessionScalarWhereInput[]
  }

  export type WhatsAppSessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<WhatsAppSessionCreateWithoutUserInput, WhatsAppSessionUncheckedCreateWithoutUserInput> | WhatsAppSessionCreateWithoutUserInput[] | WhatsAppSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WhatsAppSessionCreateOrConnectWithoutUserInput | WhatsAppSessionCreateOrConnectWithoutUserInput[]
    upsert?: WhatsAppSessionUpsertWithWhereUniqueWithoutUserInput | WhatsAppSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: WhatsAppSessionCreateManyUserInputEnvelope
    set?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    disconnect?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    delete?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    connect?: WhatsAppSessionWhereUniqueInput | WhatsAppSessionWhereUniqueInput[]
    update?: WhatsAppSessionUpdateWithWhereUniqueWithoutUserInput | WhatsAppSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: WhatsAppSessionUpdateManyWithWhereWithoutUserInput | WhatsAppSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: WhatsAppSessionScalarWhereInput | WhatsAppSessionScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutWhatsappSessionsInput = {
    create?: XOR<UserCreateWithoutWhatsappSessionsInput, UserUncheckedCreateWithoutWhatsappSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutWhatsappSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type UserUpdateOneRequiredWithoutWhatsappSessionsNestedInput = {
    create?: XOR<UserCreateWithoutWhatsappSessionsInput, UserUncheckedCreateWithoutWhatsappSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutWhatsappSessionsInput
    upsert?: UserUpsertWithoutWhatsappSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutWhatsappSessionsInput, UserUpdateWithoutWhatsappSessionsInput>, UserUncheckedUpdateWithoutWhatsappSessionsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type WhatsAppSessionCreateWithoutUserInput = {
    id?: string
    slot: number
    phone?: string | null
    displayName?: string | null
    profilePicUrl?: string | null
    status?: string
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WhatsAppSessionUncheckedCreateWithoutUserInput = {
    id?: string
    slot: number
    phone?: string | null
    displayName?: string | null
    profilePicUrl?: string | null
    status?: string
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WhatsAppSessionCreateOrConnectWithoutUserInput = {
    where: WhatsAppSessionWhereUniqueInput
    create: XOR<WhatsAppSessionCreateWithoutUserInput, WhatsAppSessionUncheckedCreateWithoutUserInput>
  }

  export type WhatsAppSessionCreateManyUserInputEnvelope = {
    data: WhatsAppSessionCreateManyUserInput | WhatsAppSessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type WhatsAppSessionUpsertWithWhereUniqueWithoutUserInput = {
    where: WhatsAppSessionWhereUniqueInput
    update: XOR<WhatsAppSessionUpdateWithoutUserInput, WhatsAppSessionUncheckedUpdateWithoutUserInput>
    create: XOR<WhatsAppSessionCreateWithoutUserInput, WhatsAppSessionUncheckedCreateWithoutUserInput>
  }

  export type WhatsAppSessionUpdateWithWhereUniqueWithoutUserInput = {
    where: WhatsAppSessionWhereUniqueInput
    data: XOR<WhatsAppSessionUpdateWithoutUserInput, WhatsAppSessionUncheckedUpdateWithoutUserInput>
  }

  export type WhatsAppSessionUpdateManyWithWhereWithoutUserInput = {
    where: WhatsAppSessionScalarWhereInput
    data: XOR<WhatsAppSessionUpdateManyMutationInput, WhatsAppSessionUncheckedUpdateManyWithoutUserInput>
  }

  export type WhatsAppSessionScalarWhereInput = {
    AND?: WhatsAppSessionScalarWhereInput | WhatsAppSessionScalarWhereInput[]
    OR?: WhatsAppSessionScalarWhereInput[]
    NOT?: WhatsAppSessionScalarWhereInput | WhatsAppSessionScalarWhereInput[]
    id?: StringFilter<"WhatsAppSession"> | string
    userId?: StringFilter<"WhatsAppSession"> | string
    slot?: IntFilter<"WhatsAppSession"> | number
    phone?: StringNullableFilter<"WhatsAppSession"> | string | null
    displayName?: StringNullableFilter<"WhatsAppSession"> | string | null
    profilePicUrl?: StringNullableFilter<"WhatsAppSession"> | string | null
    status?: StringFilter<"WhatsAppSession"> | string
    lastSeen?: DateTimeNullableFilter<"WhatsAppSession"> | Date | string | null
    createdAt?: DateTimeFilter<"WhatsAppSession"> | Date | string
    updatedAt?: DateTimeFilter<"WhatsAppSession"> | Date | string
  }

  export type UserCreateWithoutWhatsappSessionsInput = {
    id: string
    email: string
    name: string
    whatsappPhone?: string | null
  }

  export type UserUncheckedCreateWithoutWhatsappSessionsInput = {
    id: string
    email: string
    name: string
    whatsappPhone?: string | null
  }

  export type UserCreateOrConnectWithoutWhatsappSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutWhatsappSessionsInput, UserUncheckedCreateWithoutWhatsappSessionsInput>
  }

  export type UserUpsertWithoutWhatsappSessionsInput = {
    update: XOR<UserUpdateWithoutWhatsappSessionsInput, UserUncheckedUpdateWithoutWhatsappSessionsInput>
    create: XOR<UserCreateWithoutWhatsappSessionsInput, UserUncheckedCreateWithoutWhatsappSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutWhatsappSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutWhatsappSessionsInput, UserUncheckedUpdateWithoutWhatsappSessionsInput>
  }

  export type UserUpdateWithoutWhatsappSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    whatsappPhone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserUncheckedUpdateWithoutWhatsappSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    whatsappPhone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type WhatsAppSessionCreateManyUserInput = {
    id?: string
    slot: number
    phone?: string | null
    displayName?: string | null
    profilePicUrl?: string | null
    status?: string
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WhatsAppSessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    slot?: IntFieldUpdateOperationsInput | number
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicUrl?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppSessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    slot?: IntFieldUpdateOperationsInput | number
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicUrl?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhatsAppSessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    slot?: IntFieldUpdateOperationsInput | number
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicUrl?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}