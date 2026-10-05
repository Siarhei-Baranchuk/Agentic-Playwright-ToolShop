/* eslint-disable playwright/no-skipped-test -- documented app defects are kept as skipped tests with a FIXME */
import { faker } from '@faker-js/faker';
import { CheckoutRules, ContactSubjects } from '../../../enums/app/app';
import { expect, test } from '../../../fixtures/pom/test-options';
import { generateContactMessage } from '../../../test-data/factories/app/checkout.factory';

const EMPTY_TXT = {
    name: 'note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(0),
};

/**
 * Guest details for the contact form, generated with Faker.
 *
 * @returns {{ firstName: string; lastName: string; email: string }} Guest details.
 */
function generateGuest(): {
    firstName: string;
    lastName: string;
    email: string;
} {
    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
    };
}

test.describe('contact form — guest', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ pm }) => {
        await pm.contactPage.open();
    });

    test(
        'should send a guest message with an empty .txt attachment',
        { tag: '@smoke' },
        async ({ pm }) => {
            const { subject, message } = generateContactMessage();

            await test.step('Preconditions: the contact form is shown with the guest fields', async () => {
                await expect(pm.contactPage.heading).toBeVisible();
                await expect(pm.contactPage.firstNameInput).toBeVisible();
            });

            await test.step('Steps: fill the form, attach an empty .txt file and send', async () => {
                await pm.contactPage.fillGuestDetails(generateGuest());
                await pm.contactPage.fillMessage(
                    subject as ContactSubjects,
                    message
                );
                await pm.contactPage.attach(EMPTY_TXT);
                await pm.contactPage.send();
            });

            await test.step('Expected: the thank-you message is shown', async () => {
                await expect(pm.contactPage.successMessage).toBeVisible();
            });
        }
    );

    test(
        'should require a subject and a message',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the contact form is empty', async () => {
                await expect(pm.contactPage.messageInput).toHaveValue('');
            });

            await test.step('Steps: send the empty form', async () => {
                await pm.contactPage.send();
            });

            await test.step('Expected: both required errors are shown and nothing is sent', async () => {
                await expect(pm.contactPage.subjectRequiredError).toBeVisible();
                await expect(pm.contactPage.messageRequiredError).toBeVisible();
                await expect(pm.contactPage.successMessage).toBeHidden();
            });
        }
    );

    test(
        'should reject a message shorter than 50 characters',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the contact form is shown', async () => {
                await expect(pm.contactPage.messageInput).toBeVisible();
            });

            await test.step('Steps: enter a short message and send', async () => {
                await pm.contactPage.fillMessage(
                    ContactSubjects.WEBMASTER,
                    faker.lorem.word()
                );
                await pm.contactPage.send();
            });

            await test.step('Expected: the minimum-length error is shown', async () => {
                await expect(pm.contactPage.messageTooShortError).toBeVisible();
            });
        }
    );

    test(
        'should reject a malformed email address',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the contact form is shown', async () => {
                await expect(pm.contactPage.emailInput).toBeVisible();
            });

            await test.step('Steps: enter an email without "@" and send', async () => {
                await pm.contactPage.emailInput.fill(faker.lorem.word());
                await pm.contactPage.send();
            });

            await test.step('Expected: the email format error is shown', async () => {
                await expect(pm.contactPage.emailFormatError).toBeVisible();
            });
        }
    );

    for (const { name, file, error } of [
        {
            name: 'a file that is not .txt',
            file: {
                name: 'note.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.alloc(0),
            },
            error: 'attachmentNotTxtError',
        },
        {
            name: 'a .txt file that is not empty',
            file: {
                name: 'note.txt',
                mimeType: 'text/plain',
                buffer: Buffer.from(faker.lorem.word()),
            },
            error: 'attachmentNotEmptyError',
        },
    ] as const) {
        test(
            `should reject ${name} as attachment`,
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the attachment field is shown', async () => {
                    await expect(pm.contactPage.attachmentInput).toBeAttached();
                });

                await test.step('Steps: attach the file', async () => {
                    await pm.contactPage.attach(file);
                });

                await test.step('Expected: the attachment error is shown after sending', async () => {
                    // A Send fired before Angular hydrates the form is lost, so it is retried.
                    await expect(async () => {
                        await pm.contactPage.send();
                        await expect(pm.contactPage[error]).toBeVisible();
                    }).toPass();
                });
            }
        );
    }

    test(
        `should accept a message of up to ${CheckoutRules.CONTACT_MESSAGE_MAX_LENGTH} characters`,
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the contact form is shown', async () => {
                await expect(pm.contactPage.messageInput).toBeVisible();
            });

            await test.step('Steps: send a message of exactly the maximum length', async () => {
                await pm.contactPage.fillGuestDetails(generateGuest());
                await pm.contactPage.fillMessage(
                    ContactSubjects.RETURN,
                    'a'.repeat(CheckoutRules.CONTACT_MESSAGE_MAX_LENGTH)
                );
                await pm.contactPage.send();
            });

            await test.step('Expected: the thank-you message is shown', async () => {
                await expect(pm.contactPage.successMessage).toBeVisible();
            });
        }
    );

    // FIXME: a guest can send the form without first name, last name and email — AC2 of the Contact Form story requires them. See docs/test-plan.md, defect #36.
    test.skip(
        'should require the name and email of a guest',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the guest fields are empty', async () => {
                await expect(pm.contactPage.firstNameInput).toHaveValue('');
            });

            await test.step('Steps: send a subject and a valid message only', async () => {
                const { subject, message } = generateContactMessage();
                await pm.contactPage.fillMessage(
                    subject as ContactSubjects,
                    message
                );
                await pm.contactPage.send();
            });

            await test.step('Expected: the message is not sent', async () => {
                await expect(pm.contactPage.successMessage).toBeHidden();
            });
        }
    );
});

test.describe('contact form — logged-in customer', () => {
    test(
        'should not ask a logged-in customer for name and email',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the customer is logged in', async () => {
                await pm.contactPage.open();
                await expect(pm.navComponent.userMenu).toBeVisible();
            });

            await test.step('Steps: look at the contact form', async () => {
                await expect(pm.contactPage.messageInput).toBeVisible();
            });

            await test.step('Expected: the name and email fields are not shown', async () => {
                await expect(pm.contactPage.firstNameInput).toBeHidden();
                await expect(pm.contactPage.lastNameInput).toBeHidden();
                await expect(pm.contactPage.emailInput).toBeHidden();
            });
        }
    );
});
