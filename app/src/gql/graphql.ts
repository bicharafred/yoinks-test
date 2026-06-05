/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AWSDate: { input: any; output: any; }
  AWSDateTime: { input: any; output: any; }
  AWSEmail: { input: any; output: any; }
  AWSIPAddress: { input: any; output: any; }
  AWSJSON: { input: any; output: any; }
  AWSPhone: { input: any; output: any; }
  AWSTime: { input: any; output: any; }
  AWSTimestamp: { input: any; output: any; }
  AWSURL: { input: any; output: any; }
};

export type Author = {
  __typename?: 'Author';
  avatar?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type BlockAuthor = {
  blockedAuthorId: Scalars['ID']['input'];
};

// Input type for posting a new comment on a Moment.
export type CreateCommentInput = {
  authorId: Scalars['ID']['input'];
  momentId: Scalars['ID']['input'];
  parentCommentId?: InputMaybe<Scalars['ID']['input']>;
  text: Scalars['String']['input'];
};

export type CreateInteractionInput = {
  applauseCount: Scalars['Int']['input'];
  authorId: Scalars['ID']['input'];
  interactionCreatedAt: Scalars['Int']['input'];
  momentId: Scalars['ID']['input'];
  momentSequence: Scalars['Int']['input'];
  previousApplauseCount: Scalars['Int']['input'];
  viewer: ViewerInput;
};

export type CreateMomentInput = {
  id: Scalars['ID']['input'];
  isLocal: Scalars['Boolean']['input'];
  mediaUrl: Scalars['String']['input'];
  type: MomentType;
  videoThumbnail?: InputMaybe<Scalars['String']['input']>;
};

export type CreateReportInput = {
  authorId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  momentId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};

export type CreateReportResponse = {
  __typename?: 'CreateReportResponse';
  error?: Maybe<Scalars['String']['output']>;
  reportId?: Maybe<Scalars['ID']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CreateUserInput = {
  allowAdultContent: Scalars['Boolean']['input'];
  avatar?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  hasIdentityValidation: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  isAdult: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
};

// A single comment on a Moment, including the commenter's author profile.
export type Comment = {
  __typename?: 'Comment';
  author: Author;
  createdAt: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  momentId: Scalars['ID']['output'];
  parentCommentId?: Maybe<Scalars['ID']['output']>;
  text: Scalars['String']['output'];
};

// Paginated result wrapper for commentsByMoment queries.
export type CommentsByMomentResult = {
  __typename?: 'CommentsByMomentResult';
  items: Array<Comment>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type GetAuthorMomentResult = {
  __typename?: 'GetAuthorMomentResult';
  items: Array<Moment>;
  nextToken?: Maybe<Scalars['String']['output']>;
  resultCount: Scalars['Int']['output'];
};

export type GetFeedMomentResult = {
  __typename?: 'GetFeedMomentResult';
  items: Array<Moment>;
  nextToken?: Maybe<Scalars['String']['output']>;
  resultCount: Scalars['Int']['output'];
};

export type GetMomentInput = {
  authorId: Scalars['ID']['input'];
  sequence: Scalars['Int']['input'];
};

export type GetNotificationsResult = {
  __typename?: 'GetNotificationsResult';
  items: Array<Notification>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type HideMoment = {
  hiddenMomentId: Scalars['ID']['input'];
};

export type Interaction = {
  __typename?: 'Interaction';
  applauseCount: Scalars['Int']['output'];
  authorId: Scalars['ID']['output'];
  createdAt: Scalars['Int']['output'];
  hasPaidForView?: Maybe<Scalars['Boolean']['output']>;
  hasSeen: Scalars['Boolean']['output'];
  momentId: Scalars['ID']['output'];
  momentSequence: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['Int']['output']>;
  viewer: Viewer;
  viewerId: Scalars['ID']['output'];
};

export type InteractionsByMomentResult = {
  __typename?: 'InteractionsByMomentResult';
  interactions: Array<Interaction>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type Moment = {
  __typename?: 'Moment';
  applauseCount: Scalars['Int']['output'];
  author: Author;
  // Total number of comments on this Moment — shown on the feed card icon.
  commentCount?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['Int']['output'];
  // Local-only field — not in the GraphQL schema. Populated on optimistic
  // feed entries so the crop/reposition adjustment is reflected immediately
  // after posting, before the real server data replaces the entry.
  cropTransform?: import("@/types/cropTransform").CropTransform | null;
  mediaItems?: import("@/types/mediaItem").MediaItem[] | null;
  description?: Maybe<Scalars['String']['output']>;
  hasAdultContent?: Maybe<Scalars['Boolean']['output']>;
  hasViewerSeen?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  isBlurred?: Maybe<Scalars['Boolean']['output']>;
  isLocal: Scalars['Boolean']['output'];
  isLocked?: Maybe<Scalars['Boolean']['output']>;
  isValidated?: Maybe<Scalars['Boolean']['output']>;
  mediaUrl: Scalars['String']['output'];
  sequence?: Maybe<Scalars['Int']['output']>;
  type: MomentType;
  updatedAt?: Maybe<Scalars['Int']['output']>;
  videoThumbnailUrl?: Maybe<Scalars['String']['output']>;
  viewerApplauseCount?: Maybe<Scalars['Int']['output']>;
};

export enum MomentType {
  Photo = 'PHOTO',
  Video = 'VIDEO'
}

export type MoneyTransaction = {
  __typename?: 'MoneyTransaction';
  amount?: Maybe<Scalars['Int']['output']>;
  createdAt?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  relatedInfo?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
};

export type Mutation = {
  __typename?: 'Mutation';
  blockAuthor: User;
  // Creates a comment and returns it with author info.
  createComment: Comment;
  createInteraction?: Maybe<Scalars['Boolean']['output']>;
  createMoment: Moment;
  createReport: CreateReportResponse;
  createUser: User;
  hideMoment: User;
  publishNotification?: Maybe<Notification>;
  saveDeviceToken: Scalars['Boolean']['output'];
  setNotificationAsRead: Scalars['Boolean']['output'];
  unblockAuthor: User;
  unblurMoment?: Maybe<UnblurMomentResponse>;
  updateUserName: User;
};


export type MutationBlockAuthorArgs = {
  input: BlockAuthor;
};


export type MutationCreateInteractionArgs = {
  input: CreateInteractionInput;
};


export type MutationCreateMomentArgs = {
  input: CreateMomentInput;
};


export type MutationCreateReportArgs = {
  input: CreateReportInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationHideMomentArgs = {
  input: HideMoment;
};


export type MutationPublishNotificationArgs = {
  input: NotificationInput;
};


export type MutationSaveDeviceTokenArgs = {
  deviceToken: Scalars['String']['input'];
  platform?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetNotificationAsReadArgs = {
  notificationId: Scalars['ID']['input'];
};


export type MutationUnblockAuthorArgs = {
  input: BlockAuthor;
};


export type MutationUnblurMomentArgs = {
  input: UnblurMomentInput;
};


export type MutationUpdateUserNameArgs = {
  input: UpdateUserName;
};

export type Notification = {
  __typename?: 'Notification';
  createdAt: Scalars['String']['output'];
  isRead: Scalars['Boolean']['output'];
  mediaUrl?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  momentId?: Maybe<Scalars['String']['output']>;
  momentSequence?: Maybe<Scalars['Int']['output']>;
  notificationId: Scalars['String']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  userId: Scalars['String']['output'];
  viewerAvatar?: Maybe<Scalars['String']['output']>;
  viewerId?: Maybe<Scalars['String']['output']>;
  viewerName?: Maybe<Scalars['String']['output']>;
};

export type NotificationInput = {
  createdAt: Scalars['String']['input'];
  isRead: Scalars['Boolean']['input'];
  mediaUrl?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  momentId: Scalars['String']['input'];
  momentSequence?: InputMaybe<Scalars['Int']['input']>;
  notificationId: Scalars['String']['input'];
  title: Scalars['String']['input'];
  type: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  // Returns paginated comments for a given Moment.
  commentsByMoment?: Maybe<CommentsByMomentResult>;
  getAuthorMoments?: Maybe<GetAuthorMomentResult>;
  getFeedMoments?: Maybe<GetFeedMomentResult>;
  getMoment: Moment;
  getNotifications: GetNotificationsResult;
  getUser?: Maybe<User>;
  getWalletBalance?: Maybe<WalletAmountResponse>;
  interactionsByMoment?: Maybe<InteractionsByMomentResult>;
};


export type QueryGetAuthorMomentsArgs = {
  authorId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetFeedMomentsArgs = {
  authorId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetMomentArgs = {
  input: GetMomentInput;
};


export type QueryGetNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetWalletBalanceArgs = {
  authorId: Scalars['ID']['input'];
};


export type QueryInteractionsByMomentArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  momentId: Scalars['ID']['input'];
  nextToken?: InputMaybe<Scalars['String']['input']>;
};

export type Report = {
  __typename?: 'Report';
  authorId: Scalars['ID']['output'];
  createdAt: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  momentId: Scalars['ID']['output'];
  reason: Scalars['String']['output'];
  reporterId: Scalars['ID']['output'];
  status: ReportStatus;
  updatedAt?: Maybe<Scalars['Int']['output']>;
};

export enum ReportStatus {
  Dismissed = 'DISMISSED',
  Pending = 'PENDING',
  Resolved = 'RESOLVED'
}

export type Subscription = {
  __typename?: 'Subscription';
  onNewNotification?: Maybe<Notification>;
};


export type SubscriptionOnNewNotificationArgs = {
  userId: Scalars['ID']['input'];
};

export type UnblurMomentInput = {
  authorId: Scalars['ID']['input'];
  momentId: Scalars['ID']['input'];
  momentSequence: Scalars['Int']['input'];
  viewer: ViewerInput;
};

export type UnblurMomentResponse = {
  __typename?: 'UnblurMomentResponse';
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type UpdateUserName = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  allowAdultContent: Scalars['Boolean']['output'];
  avatar?: Maybe<Scalars['String']['output']>;
  blockedAuthorIds?: Maybe<Array<Scalars['String']['output']>>;
  createdAt?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  hasIdentityValidation: Scalars['Boolean']['output'];
  hiddenMomentIds?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  isAdult: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type UserDevice = {
  __typename?: 'UserDevice';
  deviceToken: Scalars['String']['output'];
  platform?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type Viewer = {
  __typename?: 'Viewer';
  avatar?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type ViewerInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type WalletAmountResponse = {
  __typename?: 'WalletAmountResponse';
  balance: Scalars['Float']['output'];
  redeemable: Scalars['Float']['output'];
  transferable: Scalars['Float']['output'];
};

export type AuthorFragmentFragment = { __typename?: 'Author', id: string, name: string, avatar?: string | null };

export type MomentFragmentFragment = { __typename?: 'Moment', id: string, applauseCount: number, viewerApplauseCount?: number | null, createdAt: number, updatedAt?: number | null, isLocal: boolean, isBlurred?: boolean | null, isLocked?: boolean | null, hasAdultContent?: boolean | null, sequence?: number | null, type: MomentType, videoThumbnailUrl?: string | null, mediaUrl: string, hasViewerSeen?: boolean | null, description?: string | null, commentCount?: number | null, mediaItems?: Array<{ __typename?: 'MediaItem', id: string, mediaUrl: string, mediaType: MomentType, thumbnailUrl?: string | null }> | null, author: { __typename?: 'Author', id: string, name: string, avatar?: string | null } };

export type CreateInteractionMutationVariables = Exact<{
  input: CreateInteractionInput;
}>;


export type CreateInteractionMutation = { __typename?: 'Mutation', createInteraction?: boolean | null };

export type UpdateUserNameMutationVariables = Exact<{
  input: UpdateUserName;
}>;


export type UpdateUserNameMutation = { __typename?: 'Mutation', updateUserName: { __typename?: 'User', id: string, name: string, avatar?: string | null, isAdult: boolean, hasIdentityValidation: boolean, allowAdultContent: boolean, email?: string | null } };

export type UnblurMomentMutationVariables = Exact<{
  input: UnblurMomentInput;
}>;


export type UnblurMomentMutation = { __typename?: 'Mutation', unblurMoment?: { __typename?: 'UnblurMomentResponse', success: boolean, error?: string | null } | null };

export type CreateReportMutationVariables = Exact<{
  input: CreateReportInput;
}>;


export type CreateReportMutation = { __typename?: 'Mutation', createReport: { __typename?: 'CreateReportResponse', success: boolean, error?: string | null } };

export type BlockAuthorMutationVariables = Exact<{
  input: BlockAuthor;
}>;


export type BlockAuthorMutation = { __typename?: 'Mutation', blockAuthor: { __typename?: 'User', id: string, email?: string | null, name: string, isAdult: boolean, hasIdentityValidation: boolean, allowAdultContent: boolean, blockedAuthorIds?: Array<string> | null } };

export type UnblockAuthorMutationVariables = Exact<{
  input: BlockAuthor;
}>;


export type UnblockAuthorMutation = { __typename?: 'Mutation', unblockAuthor: { __typename?: 'User', id: string, email?: string | null, name: string, isAdult: boolean, hasIdentityValidation: boolean, allowAdultContent: boolean, blockedAuthorIds?: Array<string> | null } };

export type HideMomentMutationVariables = Exact<{
  input: HideMoment;
}>;


export type HideMomentMutation = { __typename?: 'Mutation', hideMoment: { __typename?: 'User', id: string, email?: string | null, name: string, isAdult: boolean, hasIdentityValidation: boolean, allowAdultContent: boolean, hiddenMomentIds?: Array<string> | null } };

export type SaveDeviceTokenMutationVariables = Exact<{
  deviceToken: Scalars['String']['input'];
  platform: Scalars['String']['input'];
}>;


export type SaveDeviceTokenMutation = { __typename?: 'Mutation', saveDeviceToken: boolean };

export type SetNotificationAsReadMutationVariables = Exact<{
  notificationId: Scalars['ID']['input'];
}>;


export type SetNotificationAsReadMutation = { __typename?: 'Mutation', setNotificationAsRead: boolean };

export type GetFeedMomentsQueryVariables = Exact<{
  authorId: Scalars['ID']['input'];
  nextToken?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetFeedMomentsQuery = { __typename?: 'Query', getFeedMoments?: { __typename?: 'GetFeedMomentResult', nextToken?: string | null, resultCount: number, items: Array<{ __typename?: 'Moment', id: string, applauseCount: number, viewerApplauseCount?: number | null, createdAt: number, updatedAt?: number | null, isLocal: boolean, isBlurred?: boolean | null, isLocked?: boolean | null, hasAdultContent?: boolean | null, sequence?: number | null, type: MomentType, videoThumbnailUrl?: string | null, mediaUrl: string, hasViewerSeen?: boolean | null, description?: string | null, commentCount?: number | null, mediaItems?: Array<{ __typename?: 'MediaItem', id: string, mediaUrl: string, mediaType: MomentType, thumbnailUrl?: string | null }> | null, author: { __typename?: 'Author', id: string, name: string, avatar?: string | null } }> } | null };

export type GetWalletBalanceQueryVariables = Exact<{
  authorId: Scalars['ID']['input'];
}>;


export type GetWalletBalanceQuery = { __typename?: 'Query', getWalletBalance?: { __typename?: 'WalletAmountResponse', transferable: number, redeemable: number } | null };

export type GetInteractionsByMomentQueryVariables = Exact<{
  momentId: Scalars['ID']['input'];
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetInteractionsByMomentQuery = { __typename?: 'Query', interactionsByMoment?: { __typename?: 'InteractionsByMomentResult', nextToken?: string | null, interactions: Array<{ __typename?: 'Interaction', viewerId: string, applauseCount: number, viewer: { __typename?: 'Viewer', id: string, name?: string | null, avatar?: string | null } }> } | null };

export type GetAuthorMomentsQueryVariables = Exact<{
  authorId: Scalars['ID']['input'];
  nextToken?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetAuthorMomentsQuery = { __typename?: 'Query', getAuthorMoments?: { __typename?: 'GetAuthorMomentResult', nextToken?: string | null, resultCount: number, items: Array<{ __typename?: 'Moment', id: string, applauseCount: number, viewerApplauseCount?: number | null, createdAt: number, updatedAt?: number | null, isLocal: boolean, isBlurred?: boolean | null, isLocked?: boolean | null, hasAdultContent?: boolean | null, sequence?: number | null, type: MomentType, videoThumbnailUrl?: string | null, mediaUrl: string, hasViewerSeen?: boolean | null, description?: string | null, commentCount?: number | null, mediaItems?: Array<{ __typename?: 'MediaItem', id: string, mediaUrl: string, mediaType: MomentType, thumbnailUrl?: string | null }> | null, author: { __typename?: 'Author', id: string, name: string, avatar?: string | null } }> } | null };

export type GetMomentQueryVariables = Exact<{
  input: GetMomentInput;
}>;


export type GetMomentQuery = { __typename?: 'Query', getMoment: { __typename?: 'Moment', id: string, applauseCount: number, viewerApplauseCount?: number | null, createdAt: number, updatedAt?: number | null, isLocal: boolean, isBlurred?: boolean | null, isLocked?: boolean | null, hasAdultContent?: boolean | null, sequence?: number | null, type: MomentType, videoThumbnailUrl?: string | null, mediaUrl: string, hasViewerSeen?: boolean | null, description?: string | null, commentCount?: number | null, mediaItems?: Array<{ __typename?: 'MediaItem', id: string, mediaUrl: string, mediaType: MomentType, thumbnailUrl?: string | null }> | null, author: { __typename?: 'Author', id: string, name: string, avatar?: string | null } } };

export type GetNotificationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetNotificationsQuery = { __typename?: 'Query', getNotifications: { __typename?: 'GetNotificationsResult', nextToken?: string | null, items: Array<{ __typename?: 'Notification', notificationId: string, title: string, message: string, type: string, isRead: boolean, createdAt: string, mediaUrl?: string | null, userId: string, momentId?: string | null, momentSequence?: number | null, viewerId?: string | null, viewerName?: string | null, viewerAvatar?: string | null }> } };

export type OnNewNotificationSubscriptionVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type OnNewNotificationSubscription = { __typename?: 'Subscription', onNewNotification?: { __typename?: 'Notification', title: string, notificationId: string, createdAt: string, type: string, message: string, isRead: boolean } | null };

// Variables and result types for the GetCommentsByMoment query.
export type GetCommentsByMomentQueryVariables = Exact<{
  momentId: Scalars['ID']['input'];
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;

export type GetCommentsByMomentQuery = { __typename?: 'Query', commentsByMoment?: { __typename?: 'CommentsByMomentResult', nextToken?: string | null, items: Array<{ __typename?: 'Comment', id: string, momentId: string, parentCommentId?: string | null, text: string, createdAt: number, author: { __typename?: 'Author', id: string, name: string, avatar?: string | null } }> } | null };

// Variables and result types for the CreateComment mutation.
export type CreateCommentMutationVariables = Exact<{
  input: CreateCommentInput;
}>;

export type CreateCommentMutation = { __typename?: 'Mutation', createComment: { __typename?: 'Comment', id: string, momentId: string, text: string, createdAt: number, author: { __typename?: 'Author', id: string, name: string, avatar?: string | null } } };

export const AuthorFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Author"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]} as unknown as DocumentNode<AuthorFragmentFragment, unknown>;
export const MomentFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MomentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Moment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"applauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewerApplauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLocal"}},{"kind":"Field","name":{"kind":"Name","value":"isBlurred"}},{"kind":"Field","name":{"kind":"Name","value":"isLocked"}},{"kind":"Field","name":{"kind":"Name","value":"hasAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"sequence"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"videoThumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewerSeen"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"mediaItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthorFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Author"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]} as unknown as DocumentNode<MomentFragmentFragment, unknown>;
export const CreateInteractionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateInteraction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateInteractionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createInteraction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CreateInteractionMutation, CreateInteractionMutationVariables>;
export const UpdateUserNameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserName"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserName"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserName"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"isAdult"}},{"kind":"Field","name":{"kind":"Name","value":"hasIdentityValidation"}},{"kind":"Field","name":{"kind":"Name","value":"allowAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<UpdateUserNameMutation, UpdateUserNameMutationVariables>;
export const UnblurMomentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnblurMoment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UnblurMomentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unblurMoment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<UnblurMomentMutation, UnblurMomentMutationVariables>;
export const CreateReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateReportInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<CreateReportMutation, CreateReportMutationVariables>;
export const BlockAuthorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BlockAuthor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockAuthor"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blockAuthor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isAdult"}},{"kind":"Field","name":{"kind":"Name","value":"hasIdentityValidation"}},{"kind":"Field","name":{"kind":"Name","value":"allowAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"blockedAuthorIds"}}]}}]}}]} as unknown as DocumentNode<BlockAuthorMutation, BlockAuthorMutationVariables>;
export const UnblockAuthorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnblockAuthor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockAuthor"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unblockAuthor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isAdult"}},{"kind":"Field","name":{"kind":"Name","value":"hasIdentityValidation"}},{"kind":"Field","name":{"kind":"Name","value":"allowAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"blockedAuthorIds"}}]}}]}}]} as unknown as DocumentNode<UnblockAuthorMutation, UnblockAuthorMutationVariables>;
export const HideMomentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"HideMoment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HideMoment"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hideMoment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isAdult"}},{"kind":"Field","name":{"kind":"Name","value":"hasIdentityValidation"}},{"kind":"Field","name":{"kind":"Name","value":"allowAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"hiddenMomentIds"}}]}}]}}]} as unknown as DocumentNode<HideMomentMutation, HideMomentMutationVariables>;
export const SaveDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"platform"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"platform"},"value":{"kind":"Variable","name":{"kind":"Name","value":"platform"}}}]}]}}]} as unknown as DocumentNode<SaveDeviceTokenMutation, SaveDeviceTokenMutationVariables>;
export const SetNotificationAsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetNotificationAsRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"notificationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setNotificationAsRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"notificationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"notificationId"}}}]}]}}]} as unknown as DocumentNode<SetNotificationAsReadMutation, SetNotificationAsReadMutationVariables>;
export const GetFeedMomentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFeedMoments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getFeedMoments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"authorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"nextToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MomentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextToken"}},{"kind":"Field","name":{"kind":"Name","value":"resultCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Author"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MomentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Moment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"applauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewerApplauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLocal"}},{"kind":"Field","name":{"kind":"Name","value":"isBlurred"}},{"kind":"Field","name":{"kind":"Name","value":"isLocked"}},{"kind":"Field","name":{"kind":"Name","value":"hasAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"sequence"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"videoThumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewerSeen"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"mediaItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthorFragment"}}]}}]}}]} as unknown as DocumentNode<GetFeedMomentsQuery, GetFeedMomentsQueryVariables>;
export const GetWalletBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWalletBalance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getWalletBalance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"authorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transferable"}},{"kind":"Field","name":{"kind":"Name","value":"redeemable"}}]}}]}}]} as unknown as DocumentNode<GetWalletBalanceQuery, GetWalletBalanceQueryVariables>;
export const GetInteractionsByMomentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInteractionsByMoment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"momentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"interactionsByMoment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"momentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"momentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"nextToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"interactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"viewerId"}},{"kind":"Field","name":{"kind":"Name","value":"viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"applauseCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextToken"}}]}}]}}]} as unknown as DocumentNode<GetInteractionsByMomentQuery, GetInteractionsByMomentQueryVariables>;
export const GetAuthorMomentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAuthorMoments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAuthorMoments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"authorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"nextToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MomentFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextToken"}},{"kind":"Field","name":{"kind":"Name","value":"resultCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Author"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MomentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Moment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"applauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewerApplauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLocal"}},{"kind":"Field","name":{"kind":"Name","value":"isBlurred"}},{"kind":"Field","name":{"kind":"Name","value":"isLocked"}},{"kind":"Field","name":{"kind":"Name","value":"hasAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"sequence"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"videoThumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewerSeen"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"mediaItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthorFragment"}}]}}]}}]} as unknown as DocumentNode<GetAuthorMomentsQuery, GetAuthorMomentsQueryVariables>;
export const GetMomentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMoment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetMomentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getMoment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MomentFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Author"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MomentFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Moment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"applauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewerApplauseCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLocal"}},{"kind":"Field","name":{"kind":"Name","value":"isBlurred"}},{"kind":"Field","name":{"kind":"Name","value":"isLocked"}},{"kind":"Field","name":{"kind":"Name","value":"hasAdultContent"}},{"kind":"Field","name":{"kind":"Name","value":"sequence"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"videoThumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"hasViewerSeen"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"mediaItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthorFragment"}}]}}]}}]} as unknown as DocumentNode<GetMomentQuery, GetMomentQueryVariables>;
export const GetNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotifications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getNotifications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"nextToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"isRead"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"mediaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"momentId"}},{"kind":"Field","name":{"kind":"Name","value":"momentSequence"}},{"kind":"Field","name":{"kind":"Name","value":"viewerId"}},{"kind":"Field","name":{"kind":"Name","value":"viewerName"}},{"kind":"Field","name":{"kind":"Name","value":"viewerAvatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextToken"}}]}}]}}]} as unknown as DocumentNode<GetNotificationsQuery, GetNotificationsQueryVariables>;
// Fetches paginated comments for a single Moment.
export const GetCommentsByMomentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommentsByMoment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"momentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsByMoment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"momentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"momentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"nextToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nextToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"momentId"}},{"kind":"Field","name":{"kind":"Name","value":"parentCommentId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextToken"}}]}}]}}]} as unknown as DocumentNode<GetCommentsByMomentQuery, GetCommentsByMomentQueryVariables>;
// Posts a new comment; the caller writes it to local state for instant feedback.
export const CreateCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"momentId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode<CreateCommentMutation, CreateCommentMutationVariables>;
export const OnNewNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNewNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onNewNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"notificationId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"isRead"}}]}}]}}]} as unknown as DocumentNode<OnNewNotificationSubscription, OnNewNotificationSubscriptionVariables>;