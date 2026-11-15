import { faker } from '@faker-js/faker';
import { ContactStatuses } from '../../../enums/app/app';
import { expect, test } from '../../../fixtures/pom/test-options';
import { startBrowserSession } from '../../../helpers/app/createStorageState';
import { sendMessage } from '../../../helpers/app/users';
import { required } from '../../../helpers/util/util';

test.describe('messages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page, registeredUser }) => {
        await startBrowserSession(page, registeredUser.token);
    });

    test(
        'should tell a customer without messages that the list is empty',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the customer has sent no messages', async () => {
                await pm.accountPage.open();
                await expect(pm.accountPage.heading).toBeVisible();
            });

            await test.step('Steps: open the messages page', async () => {
                await pm.messagesPage.open();
            });

            await test.step('Expected: the empty-list message is shown', async () => {
                await expect(pm.messagesPage.emptyMessage).toBeVisible();
                await expect(pm.messagesPage.rows).toHaveCount(0);
            });
        }
    );

    test.describe('with a sent message', () => {
        /** Subject and text of a contact message the customer sent */
        let subject: string;
        let text: string;

        test.beforeEach(async ({ apiRequest, registeredUser }) => {
            const message = await sendMessage(apiRequest, registeredUser.token);
            subject = required(message.subject, 'subject');
            text = required(message.message, 'message');
        });

        test(
            'should list the message with its subject and status',
            { tag: '@smoke' },
            async ({ pm }) => {
                await test.step('Preconditions: the customer has sent a message', async () => {
                    await pm.accountPage.open();
                    await expect(pm.accountPage.heading).toBeVisible();
                });

                await test.step('Steps: open the messages page', async () => {
                    await pm.messagesPage.open();
                });

                await test.step('Expected: the message row shows the subject and the NEW status', async () => {
                    await expect(pm.messagesPage.row(subject)).toBeVisible();
                    await expect(pm.messagesPage.row(subject)).toContainText(
                        ContactStatuses.NEW
                    );
                });
            }
        );

        test(
            'should show the full message on its detail page',
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the message is listed', async () => {
                    await pm.messagesPage.open();
                    await expect(pm.messagesPage.row(subject)).toBeVisible();
                });

                await test.step('Steps: open the message details', async () => {
                    await pm.messagesPage.openDetails(subject);
                });

                await test.step('Expected: the full text and the NEW status are shown', async () => {
                    await expect(
                        pm.messageDetailPage.message(text)
                    ).toBeVisible();
                    await expect(
                        pm.messageDetailPage.status(ContactStatuses.NEW)
                    ).toBeVisible();
                    await expect(
                        pm.messageDetailPage.repliesHeading
                    ).toBeVisible();
                });
            }
        );

        test(
            'should add a reply and move the message to IN_PROGRESS',
            { tag: '@regression' },
            async ({ pm }) => {
                const reply = faker.lorem.sentence();

                await test.step('Preconditions: the message details are open', async () => {
                    await pm.messagesPage.open();
                    await pm.messagesPage.openDetails(subject);
                    await expect(
                        pm.messageDetailPage.replyButton
                    ).toBeVisible();
                });

                await test.step('Steps: send a reply', async () => {
                    await pm.messageDetailPage.reply(reply);
                });

                await test.step('Expected: the reply is listed and the status is IN_PROGRESS', async () => {
                    await expect(
                        pm.messageDetailPage.message(reply)
                    ).toBeVisible();
                    await expect(
                        pm.messageDetailPage.status(ContactStatuses.IN_PROGRESS)
                    ).toBeVisible();
                });
            }
        );

        test(
            'should return from the detail page to the list',
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the message details are open', async () => {
                    await pm.messagesPage.open();
                    await pm.messagesPage.openDetails(subject);
                    await expect(pm.messageDetailPage.backLink).toBeVisible();
                });

                await test.step('Steps: follow "Back"', async () => {
                    await pm.messageDetailPage.backLink.click();
                });

                await test.step('Expected: the messages list is shown', async () => {
                    await expect(pm.messagesPage.heading).toBeVisible();
                    await expect(pm.messagesPage.row(subject)).toBeVisible();
                });
            }
        );
    });
});
