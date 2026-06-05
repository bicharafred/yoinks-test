import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { createSubscriptionHandshakeLink } from "aws-appsync-subscription-link";
import { getValidToken, refreshAccessToken } from "./tokenManager";
import { resolveLocalUrl } from "@/utils/apiUrl";

export const resolvedApiBase = resolveLocalUrl(process.env.EXPO_PUBLIC_API_BASE ?? "");

type FeedResult<TItem> = {
  items: TItem[];
};

function mergeUniqueById<TItem extends { id: string }>(
  existingItems: TItem[] = [],
  incomingItems: TItem[] = [],
) {
  const merged = new Map<string, TItem>();

  for (const item of existingItems) {
    merged.set(item.id, item);
  }

  for (const item of incomingItems) {
    merged.set(item.id, item);
  }

  return Array.from(merged.values());
}

function mergeUniqueByNotificationId<TItem extends { notificationId: string }>(
  existingItems: TItem[] = [],
  incomingItems: TItem[] = [],
): TItem[] {
  const merged = new Map<string, TItem>();

  for (const item of existingItems) {
    merged.set(item.notificationId, item);
  }

  for (const item of incomingItems) {
    merged.set(item.notificationId, item);
  }

  return Array.from(merged.values());
}

const httpLink = new HttpLink({
  uri: resolvedApiBase,
});

const authLink = setContext(async (_, { headers }) => {
  const token = await getValidToken();
  return {
    headers: {
      ...headers,
      Authorization: token ? token : "",
    },
  };
});

const errorLink = onError(({ error, operation, forward }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      if (
        err.extensions?.code === "UNAUTHENTICATED" ||
        err.message.includes("401")
      ) {
        return new Observable((observer) => {
          refreshAccessToken()
            .then((newToken) => {
              if (!newToken) {
                observer.error(err);
                return;
              }

              const oldHeaders = operation.getContext().headers;
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  Authorization: newToken,
                },
              });

              const subscriber = {
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              };

              forward(operation).subscribe(subscriber);
            })
            .catch((tokenError) => {
              observer.error(tokenError);
            });
        });
      }
    }
  }

  if (ServerError.is(error) && error.statusCode === 401) {
    return new Observable((observer) => {
      refreshAccessToken()
        .then((newToken) => {
          if (!newToken) {
            observer.error(error);
            return;
          }

          const oldHeaders = operation.getContext().headers;
          operation.setContext({
            headers: {
              ...oldHeaders,
              Authorization: newToken,
            },
          });

          const subscriber = {
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          };

          forward(operation).subscribe(subscriber);
        })
        .catch((tokenError) => {
          observer.error(tokenError);
        });
    });
  }
});

const url = resolvedApiBase;
const region = "us-east-1";
const auth = {
  type: "AMAZON_COGNITO_USER_POOLS" as const,
  jwtToken: async () => {
    const token = await getValidToken();
    return token || "";
  },
};
const link = ApolloLink.from([
  errorLink,
  authLink,
  createSubscriptionHandshakeLink({ url, region, auth }, httpLink),
]);

export const client = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getFeedMoments: {
            keyArgs: ["authorId"],
            merge(existing, incoming, { args }) {
              if (!args?.nextToken) {
                return incoming;
              }

              const existingResult = existing as
                | FeedResult<{ id: string }>
                | undefined;
              const incomingResult = incoming as FeedResult<{ id: string }>;

              return {
                ...incoming,
                items: mergeUniqueById(
                  existingResult?.items,
                  incomingResult.items,
                ),
              };
            },
          },
          getAuthorMoments: {
            keyArgs: ["authorId"],
            merge(existing, incoming, { args }) {
              if (!args?.nextToken) {
                return incoming;
              }

              const existingResult = existing as
                | FeedResult<{ id: string }>
                | undefined;
              const incomingResult = incoming as FeedResult<{ id: string }>;

              return {
                ...incoming,
                items: mergeUniqueById(
                  existingResult?.items,
                  incomingResult.items,
                ),
              };
            },
          },
          getNotifications: {
            keyArgs: false,
            merge(existing, incoming, { args }) {
              if (!args?.nextToken) {
                return incoming;
              }

              const existingResult = existing as
                | FeedResult<{ notificationId: string }>
                | undefined;
              const incomingResult = incoming as FeedResult<{
                notificationId: string;
              }>;

              return {
                ...incoming,
                items: mergeUniqueByNotificationId(
                  existingResult?.items,
                  incomingResult.items,
                ),
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});
