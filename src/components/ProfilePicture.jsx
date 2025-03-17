import React from 'react';


const ProfilePicture = ({ image, name, size = "md", className = "" }) => {
    // Get first letter of name for fallback
    const firstLetter = name ? name.charAt(0).toUpperCase() : '?';

    // Define size classes
    const sizeClasses = {
        sm: "w-6 h-6 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-12 h-12 text-base"
    };

    // Base classes
    const baseClasses = `rounded-full overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`;

    // Determine if we have a valid image URL
    const hasValidImage = image && image !== "NULL" && !image.includes("undefined");

    return (
        <>
            {hasValidImage ? (
                <div className={baseClasses}>
                    <img
                        src={image}
                        alt={name || "User"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // If image fails to load, replace with letter avatar
                            e.target.style.display = 'none';
                            e.target.parentNode.classList.add('flex', 'items-center', 'justify-center', 'bg-blue-100', 'text-blue-800', 'font-medium');
                            e.target.parentNode.innerText = firstLetter;
                        }}
                    />
                </div>
            ) : (
                <div className={`${baseClasses} flex items-center justify-center bg-blue-100 text-blue-800 font-medium`}>
                    {firstLetter}
                </div>
            )}
        </>
    );
};

export default ProfilePicture;