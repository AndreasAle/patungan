<?php

namespace App\Enums;

enum UserRole: string
{
    case Organizer = 'ORGANIZER';
    case Admin = 'ADMIN';
}
