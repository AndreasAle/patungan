/**
 * Handing a message to WhatsApp.
 *
 * Nothing is ever sent from here. Every function below opens a compose window
 * with the text already filled in, and a person still has to choose the group
 * and press send. That is the product boundary, not a limitation: an app that
 * can message a WhatsApp group by itself is one bug away from being a spam
 * machine, whatever it was built for.
 */

/**
 * wa.me works on both phone and desktop.
 *
 * On a phone it hands off to the installed app; on a desktop it lands on
 * WhatsApp Web, or on a page offering the download if the person has neither.
 * That is a better outcome than api.whatsapp.com, which behaves inconsistently
 * once a device has the app installed.
 */
export function whatsappUrl(message: string): string {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Whether this browser can raise the OS share sheet. */
export function canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Shares through the OS sheet when it exists, and falls back to WhatsApp.
 *
 * The native sheet is the nicer path on a phone - it remembers which chats the
 * person uses - but it does not exist on most desktops, and a person who
 * dismisses it has not shared anything. So the caller always keeps a visible
 * WhatsApp button as well; this is an enhancement, never the only route.
 *
 * Returns true when the message was handed off, false when the person backed
 * out, so a caller can avoid recording a share that did not happen.
 */
export async function shareMessage(message: string): Promise<boolean> {
    if (canNativeShare()) {
        try {
            await navigator.share({ text: message });

            return true;
        } catch {
            /*
             * Almost always AbortError: the sheet opened and the person closed
             * it. Falling through to WhatsApp here would reopen something they
             * just dismissed, so this reports "not shared" and stops.
             */
            return false;
        }
    }

    window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');

    return true;
}

/**
 * Copies text, reporting whether it worked.
 *
 * The clipboard API is unavailable outside a secure context, which includes
 * plain http during local development, so the caller has to be able to show the
 * link as selectable text instead of claiming a copy that never happened.
 */
export async function copyText(value: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(value);

        return true;
    } catch {
        return false;
    }
}
