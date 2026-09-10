<?php

namespace App\Enums;

/**
 * The five things an organizer ever sends to a group.
 *
 * Named so analytics and the share endpoint can talk about a message without
 * passing its text around, and so adding a sixth kind is a change in one place
 * rather than a new string literal in a controller.
 */
enum ShareMessageType: string
{
    /** "Here is the patungan, pay here." Sent once, to the group. */
    case GroupInvite = 'GROUP_INVITE';

    /** "These people still owe." Sent to the group, names listed. */
    case UnpaidReminder = 'UNPAID_REMINDER';

    /** "Six of eight have paid." Sent to the group as a status update. */
    case Progress = 'PROGRESS';

    /** "Your bill is Rp25.000." Sent to one person, with their own link. */
    case PersonalReminder = 'PERSONAL_REMINDER';

    /** "I have paid." Sent by the payer, if they want to. */
    case PaymentSuccess = 'PAYMENT_SUCCESS';

    public function label(): string
    {
        return match ($this) {
            self::GroupInvite => 'Bagikan ke grup',
            self::UnpaidReminder => 'Tagih yang belum bayar',
            self::Progress => 'Bagikan progress',
            self::PersonalReminder => 'Tagih personal',
            self::PaymentSuccess => 'Kabari grup',
        };
    }
}
