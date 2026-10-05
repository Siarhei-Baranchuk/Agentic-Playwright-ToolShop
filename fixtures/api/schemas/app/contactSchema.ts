import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';
import { UserSchema } from './userSchema';

/*
 * Contact message schemas, built from the OpenAPI contract. Response
 * schemas list no `required` properties, so every property is optional.
 */

/** `ContactRequest` — body of `POST /messages` (required: subject, message). */
export const ContactRequestSchema = z.strictObject({
    name: z.string().max(120).optional(),
    email: z.string().max(256).optional(),
    subject: z.string().max(120),
    message: z.string().max(250),
});

/** `ContactResponse` — a guest message. */
export const ContactMessageSchema = z.strictObject({
    name: z.string().optional(),
    email: z.string().optional(),
    subject: z.string().optional(),
    message: z.string().optional(),
    status: z.string().optional(),
    id: z.string().optional(),
    created_at: z.string().optional(),
});

/** `ContactResponseAuthenticated` — a message of a logged-in user. */
export const ContactMessageAuthenticatedSchema = ContactMessageSchema.extend({
    user_id: z.string().optional(),
});

/** `ContactReplyResponse` — `POST /messages/{messageId}/reply`. */
export const ContactReplySchema = z.strictObject({
    message: z.string().optional(),
    id: z.string().optional(),
    created_at: z.string().optional(),
    user: UserSchema.optional(),
});

/** `ContactResponseFull` — a message with its user and replies. */
export const ContactMessageFullSchema =
    ContactMessageAuthenticatedSchema.extend({
        user: UserSchema.optional(),
        replies: z.array(ContactReplySchema).optional(),
    });

/** `GET /messages/{messageId}` — documented as ContactResponse | ContactResponseAuthenticated. */
export const ContactMessageDetailSchema = z.union([
    ContactMessageSchema,
    ContactMessageAuthenticatedSchema,
]);

/** `PaginatedContactMessageResponse` — `GET /messages`. */
export const PaginatedContactMessageSchema = z.strictObject({
    current_page: z.int().optional(),
    data: z
        .array(
            z.union([ContactMessageSchema, ContactMessageAuthenticatedSchema])
        )
        .optional(),
    from: z.int().optional(),
    last_page: z.int().optional(),
    per_page: z.int().optional(),
    to: z.int().optional(),
    total: z.int().optional(),
});

/** `AddContactMessageResponse` — documented body of `POST /messages`. */
export const AddContactMessageSchema = z.strictObject({
    success: z.boolean().optional(),
});

/** `FileUploadResponse` — `POST /messages/{messageId}/attach-file`. */
export const FileUploadSchema = z.strictObject({
    success: z.boolean().optional(),
});

/**
 * 400 body of `POST /messages/{messageId}/attach-file`.
 * FIXME: not documented in the spec; shape captured live.
 */
export const FileUploadErrorSchema = z.strictObject({
    errors: z.array(z.string()),
});

export type ContactRequest = zOutput<typeof ContactRequestSchema>;
export type ContactMessage = zOutput<typeof ContactMessageSchema>;
export type ContactMessageAuthenticated = zOutput<
    typeof ContactMessageAuthenticatedSchema
>;
export type ContactMessageFull = zOutput<typeof ContactMessageFullSchema>;
export type ContactMessageDetail = zOutput<typeof ContactMessageDetailSchema>;
export type ContactReply = zOutput<typeof ContactReplySchema>;
export type PaginatedContactMessages = zOutput<
    typeof PaginatedContactMessageSchema
>;
export type AddContactMessage = zOutput<typeof AddContactMessageSchema>;
export type FileUpload = zOutput<typeof FileUploadSchema>;
export type FileUploadError = zOutput<typeof FileUploadErrorSchema>;
