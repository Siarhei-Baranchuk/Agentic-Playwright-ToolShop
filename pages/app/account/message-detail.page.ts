import { Locator, Page } from '@playwright/test';
import {
    ApiEndpoints,
    ContactStatuses,
    PageHeadings,
} from '../../../enums/app/app';
import { uiTimeouts } from '../../../config/app';

/** How often a lost reply submit is repeated */
const REPLY_SUBMIT_ATTEMPTS = 3;
/** Last path segment of the reply endpoint (`/messages/{messageId}/reply`) */
const REPLY_PATH_SUFFIX = `/${ApiEndpoints.MESSAGE_REPLY.split('/').pop()}`;

/**
 * Page Object for a contact message detail page (`/account/messages/:id`):
 * the original message, its replies and the reply form.
 *
 * Accessed in tests through the page manager: `pm.messageDetailPage`.
 */
export class MessageDetailPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get backLink(): Locator {
        return this.page.getByRole('link', { name: 'Back' });
    }

    message(text: string): Locator {
        return this.page.getByText(text, { exact: true });
    }

    status(status: ContactStatuses): Locator {
        return this.page.getByText(status, { exact: true });
    }

    get repliesHeading(): Locator {
        return this.page.getByRole('heading', { name: PageHeadings.REPLIES });
    }

    get replyInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Message' });
    }

    get replyButton(): Locator {
        return this.page.getByRole('button', { name: 'Reply' });
    }

    // ==================== Actions ====================

    /**
     * Sends a reply to the message. The reply field updates the form only on
     * keyboard events, so the text is typed key by key (`fill()` sends
     * nothing), and a submit is occasionally lost while the form catches up —
     * so the click is repeated until the reply request is sent.
     *
     * @param {string} text - The reply text.
     * @returns {Promise<void>} Resolves when the reply request has been answered.
     */
    async reply(text: string): Promise<void> {
        await this.replyInput.clear();
        await this.replyInput.pressSequentially(text);
        for (let attempt = 1; attempt <= REPLY_SUBMIT_ATTEMPTS; attempt++) {
            const sent = this.page
                .waitForResponse(
                    (response) =>
                        response.request().method() === 'POST' &&
                        response.url().endsWith(REPLY_PATH_SUFFIX),
                    { timeout: uiTimeouts.requestAfterClick }
                )
                .then(() => true)
                .catch(() => false);
            await this.replyButton.click();
            if (await sent) return;
        }
    }
}
