/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import {
    ApiEndpoints,
    ApiMessages,
    CheckoutRules,
    ContactStatuses,
} from '../../../enums/app/app';
import {
    AddContactMessage,
    AddContactMessageSchema,
    ContactMessage,
    ContactMessageAuthenticated,
    ContactMessageAuthenticatedSchema,
    ContactMessageDetail,
    ContactMessageDetailSchema,
    ContactMessageSchema,
    ContactReply,
    ContactReplySchema,
    FileUpload,
    FileUploadError,
    FileUploadErrorSchema,
    FileUploadSchema,
    PaginatedContactMessages,
    PaginatedContactMessageSchema,
} from '../../../fixtures/api/schemas/app/contactSchema';
import {
    UpdateResponse,
    UpdateResponseSchema,
} from '../../../fixtures/api/schemas/util/commonResponseSchema';
import {
    ItemNotFoundResponse,
    ItemNotFoundResponseSchema,
    MethodNotAllowedResponse,
    MethodNotAllowedResponseSchema,
    UnauthorizedResponse,
    UnauthorizedResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import type { ApiRequestFn } from '../../../fixtures/api/api-types';
import { expect, test } from '../../../fixtures/pom/test-options';
import {
    deleteUser,
    registerUser,
    type RegisteredUser,
} from '../../../helpers/app/users';
import { fillPath, required } from '../../../helpers/util/util';
import { generateContactMessage } from '../../../test-data/factories/app/checkout.factory';
import { SUBSCRIPT_SUPERSCRIPT_NAMES } from '../../../test-data/static/app/invalidCatalog';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import { INVALID_STRING_VALUES } from '../../../test-data/static/util/invalid-values';

const REQUIRED_FIELDS = ['subject', 'message'] as const;

/**
 * Sends a contact message as a logged-in user via `POST /messages`.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} token - The user's access token.
 * @returns {Promise<ContactMessageAuthenticated>} The stored message.
 */
async function sendMessage(
    apiRequest: ApiRequestFn,
    token: string
): Promise<ContactMessageAuthenticated> {
    const { name: _name, email: _email, ...payload } = generateContactMessage();
    const { status, body } = await apiRequest<ContactMessageAuthenticated>({
        method: 'POST',
        url: ApiEndpoints.MESSAGES,
        headers: token,
        body: payload,
    });
    expect(status).toBe(200);
    expect(ContactMessageAuthenticatedSchema.parse(body)).toBeTruthy();
    return body;
}

test.describe('messages', () => {
    /** A customer whose message the others must not reach */
    let owner: RegisteredUser;
    let ownersMessage: ContactMessageAuthenticated;
    let messageId: string;

    test.beforeAll(async ({ apiRequest }) => {
        owner = await registerUser(apiRequest);
        ownersMessage = await sendMessage(apiRequest, owner.token);
        messageId = required(ownersMessage.id, 'message id');
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteUser(apiRequest, owner);
    });

    test.describe('POST /messages', () => {
        // FIXME: the spec documents AddContactMessageResponse {"success": true}; the body is the stored message. See docs/test-plan.md, defect #32.
        test.skip(
            'should return 200 and the documented success body',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<AddContactMessage>({
                    method: 'POST',
                    url: ApiEndpoints.MESSAGES,
                    body: generateContactMessage(),
                });

                expect(status).toBe(200);
                expect(AddContactMessageSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 200 and store a guest message as NEW',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const payload = generateContactMessage();

                const { status, body } = await apiRequest<ContactMessage>({
                    method: 'POST',
                    url: ApiEndpoints.MESSAGES,
                    body: payload,
                });

                expect(status).toBe(200);
                expect(ContactMessageSchema.parse(body)).toBeTruthy();
                expect(body).toMatchObject({
                    ...payload,
                    status: ContactStatuses.NEW,
                });
            }
        );

        test(
            "should return 200 and link a logged-in user's message to the user",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const message = await sendMessage(
                    apiRequest,
                    registeredUser.token
                );

                expect(message).toMatchObject({
                    user_id: registeredUser.id,
                    status: ContactStatuses.NEW,
                });
            }
        );

        test(
            'should return 422 for an empty body',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.MESSAGES,
                        body: {},
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );

        for (const field of REQUIRED_FIELDS) {
            test(
                `should return 422 when ${field} is missing`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { [field]: _omitted, ...payload } =
                        generateContactMessage();

                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.MESSAGES,
                            body: payload,
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                    expect(body).toHaveProperty(field);
                }
            );

            for (const invalidValue of INVALID_STRING_VALUES) {
                test(
                    `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                    { tag: '@api' },
                    async ({ apiRequest }) => {
                        const { status, body } =
                            await apiRequest<UnprocessableEntityResponse>({
                                method: 'POST',
                                url: ApiEndpoints.MESSAGES,
                                body: {
                                    ...generateContactMessage(),
                                    [field]: invalidValue,
                                },
                            });

                        expect(status).toBe(422);
                        expect(
                            UnprocessableEntityResponseSchema.parse(body)
                        ).toBeTruthy();
                    }
                );
            }
        }

        test(
            'should return 422 for a malformed email',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.MESSAGES,
                        body: {
                            ...generateContactMessage(),
                            email: 'plaintext',
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
                expect(body).toHaveProperty('email');
            }
        );

        test(
            `should return 422 when the message is longer than ${CheckoutRules.CONTACT_MESSAGE_MAX_LENGTH} characters`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.MESSAGES,
                        body: {
                            ...generateContactMessage(),
                            message: 'a'.repeat(
                                CheckoutRules.CONTACT_MESSAGE_MAX_LENGTH + 1
                            ),
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );

        test(
            'should return 422 when the subject contains sub/superscript characters',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.MESSAGES,
                        body: {
                            ...generateContactMessage(),
                            subject: SUBSCRIPT_SUPERSCRIPT_NAMES[0],
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    });

    test.describe('POST /messages/{messageId}/attach-file', () => {
        test(
            'should return 200 for an empty .txt file',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<FileUpload>({
                    method: 'POST',
                    url: fillPath(ApiEndpoints.MESSAGE_ATTACH_FILE, {
                        messageId,
                    }),
                    multipart: {
                        file: {
                            name: 'note.txt',
                            mimeType: 'text/plain',
                            buffer: Buffer.alloc(0),
                        },
                    },
                });

                expect(status).toBe(200);
                expect(FileUploadSchema.parse(body)).toBeTruthy();
                expect(body.success).toBe(true);
            }
        );

        // 400 is not documented for this operation; the backend rejects files it does not accept.
        for (const { name, file, error } of [
            {
                name: 'a non-empty file',
                file: {
                    name: 'note.txt',
                    mimeType: 'text/plain',
                    buffer: Buffer.from('not empty'),
                },
                error: ApiMessages.FILE_NOT_EMPTY,
            },
            {
                name: 'a file that is not .txt',
                file: {
                    name: 'note.pdf',
                    mimeType: 'application/pdf',
                    buffer: Buffer.alloc(0),
                },
                error: ApiMessages.FILE_NOT_TXT,
            },
        ]) {
            test(
                `should return 400 for ${name}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } = await apiRequest<FileUploadError>({
                        method: 'POST',
                        url: fillPath(ApiEndpoints.MESSAGE_ATTACH_FILE, {
                            messageId,
                        }),
                        multipart: { file },
                    });

                    expect(status).toBe(400);
                    expect(FileUploadErrorSchema.parse(body)).toBeTruthy();
                    expect(body.errors).toEqual([error]);
                }
            );
        }

        test(
            'should return 400 when no file is attached',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<FileUploadError>({
                    method: 'POST',
                    url: fillPath(ApiEndpoints.MESSAGE_ATTACH_FILE, {
                        messageId,
                    }),
                    multipart: { note: 'no file' },
                });

                expect(status).toBe(400);
                expect(FileUploadErrorSchema.parse(body)).toBeTruthy();
                expect(body.errors).toEqual([ApiMessages.FILE_MISSING]);
            }
        );

        // FIXME: the message id is not checked — a file "attached" to an unknown message answers 200. See docs/test-plan.md, defect #33.
        for (const { description, value } of INVALID_PATH_IDS) {
            test.skip(
                `should return 404 for messageId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.MESSAGE_ATTACH_FILE, {
                                messageId: value,
                            }),
                            multipart: {
                                file: {
                                    name: 'note.txt',
                                    mimeType: 'text/plain',
                                    buffer: Buffer.alloc(0),
                                },
                            },
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        test(
            'should return 405 for an unsupported method on /messages/{messageId}/attach-file',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'GET',
                        url: fillPath(ApiEndpoints.MESSAGE_ATTACH_FILE, {
                            messageId,
                        }),
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('GET /messages', () => {
        // FIXME: messages of logged-in users carry name / email = null; ContactResponse* types them as string. See docs/test-plan.md, defect #32.
        test.skip(
            'should return 200 and only the own messages',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<PaginatedContactMessages>({
                        method: 'GET',
                        url: ApiEndpoints.MESSAGES,
                        headers: owner.token,
                    });

                expect(status).toBe(200);
                expect(PaginatedContactMessageSchema.parse(body)).toBeTruthy();
                expect(body.data?.map(({ id }) => id)).toEqual([messageId]);
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    { method: 'GET', url: ApiEndpoints.MESSAGES }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: 404 is documented for the message list, but an empty list answers 200.
        test.skip(
            'should return 404 when the message list is not available',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status } = await apiRequest({
                    method: 'GET',
                    url: ApiEndpoints.MESSAGES,
                    headers: registeredUser.token,
                });

                expect(status).toBe(404);
            }
        );

        test(
            'should return 405 for an unsupported method on /messages',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'DELETE',
                        url: ApiEndpoints.MESSAGES,
                        headers: owner.token,
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('GET /messages/{messageId}', () => {
        // FIXME: the body carries name / email = null plus undocumented user and replies. See docs/test-plan.md, defect #32.
        test.skip(
            'should return 200 and the own message',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ContactMessageDetail>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.MESSAGE, { messageId }),
                        headers: owner.token,
                    }
                );

                expect(status).toBe(200);
                expect(ContactMessageDetailSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: another user's or an unknown message answers 200 [] instead of 404. See docs/test-plan.md, defect #33.
        test.skip(
            "should return 404 for another user's message",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.MESSAGE, { messageId }),
                        headers: registeredUser.token,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: an unknown message answers 200 [] instead of 404. See docs/test-plan.md, defect #33.
        for (const { description, value } of INVALID_PATH_IDS) {
            test.skip(
                `should return 404 for messageId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.MESSAGE, {
                                messageId: value,
                            }),
                            headers: owner.token,
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.MESSAGE, { messageId }),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('POST /messages/{messageId}/reply', () => {
        // The spec documents 200 for this operation; the API answers 201 Created.
        test(
            'should return 201 and the reply of the admin',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { message } = generateContactMessage();

                const { status, body } = await apiRequest<ContactReply>({
                    method: 'POST',
                    url: fillPath(ApiEndpoints.MESSAGE_REPLY, { messageId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    body: { message },
                });

                expect(status).toBe(201);
                expect(ContactReplySchema.parse(body)).toBeTruthy();
                expect(body.message).toBe(message);
            }
        );

        // FIXME: any logged-in user can reply to another user's message — there is no ownership or role check. See docs/test-plan.md, defect #34.
        test.skip(
            "should return 403 when a customer replies to another user's message",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status } = await apiRequest({
                    method: 'POST',
                    url: fillPath(ApiEndpoints.MESSAGE_REPLY, { messageId }),
                    headers: registeredUser.token,
                    body: { message: generateContactMessage().message },
                });

                expect(status).toBe(403);
            }
        );

        test(
            'should return 422 when message is missing',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: fillPath(ApiEndpoints.MESSAGE_REPLY, {
                            messageId,
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: {},
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );

        for (const invalidValue of INVALID_STRING_VALUES) {
            test(
                `should return 422 when message is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.MESSAGE_REPLY, {
                                messageId,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: { message: invalidValue },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'POST',
                        url: fillPath(ApiEndpoints.MESSAGE_REPLY, {
                            messageId,
                        }),
                        body: { message: generateContactMessage().message },
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('PUT /messages/{messageId}/status', () => {
        for (const status of [
            ContactStatuses.IN_PROGRESS,
            ContactStatuses.RESOLVED,
            ContactStatuses.NEW,
        ]) {
            test(
                `should return 200 and set the status ${status} (admin)`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const response = await apiRequest<UpdateResponse>({
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.MESSAGE_STATUS, {
                            messageId,
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: { status },
                    });

                    expect(response.status).toBe(200);
                    expect(
                        UpdateResponseSchema.parse(response.body)
                    ).toBeTruthy();
                }
            );
        }

        // FIXME: ON_HOLD is in the documented enum but rejected (404 "Resource not found"). See docs/test-plan.md, defects #13 and #32.
        test.skip(
            `should return 200 and set the status ${ContactStatuses.ON_HOLD} (admin)`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.MESSAGE_STATUS, { messageId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    body: { status: ContactStatuses.ON_HOLD },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: any logged-in user can change the status of another user's message — no role check. See docs/test-plan.md, defect #34.
        test.skip(
            "should return 403 when a customer changes another user's message status",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status } = await apiRequest({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.MESSAGE_STATUS, { messageId }),
                    headers: registeredUser.token,
                    body: { status: ContactStatuses.RESOLVED },
                });

                expect(status).toBe(403);
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.MESSAGE_STATUS, {
                            messageId,
                        }),
                        body: { status: ContactStatuses.RESOLVED },
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for messageId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'PUT',
                            url: fillPath(ApiEndpoints.MESSAGE_STATUS, {
                                messageId: value,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: { status: ContactStatuses.RESOLVED },
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }
    });
});
