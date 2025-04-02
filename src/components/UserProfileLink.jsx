"use client";

import Link from 'next/link';

export default function UserProfileLink({ user, className = "", showRank = false }) {
    if (!user) {
        return <span className={className}>Anonymous User</span>;
    }

    const displayName = user.username || user.name || (user.email ? user.email.split('@')[0] : "Anonymous User");

    return (
        <Link href={`/user/${user.id}`} className={`hover:text-blue-600 hover:underline ${className}`}>
            {displayName}
            {showRank && user.rank && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {user.rank}
                </span>
            )}
        </Link>
    );
}