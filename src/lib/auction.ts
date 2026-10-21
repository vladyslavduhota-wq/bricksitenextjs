/** Auction closes automatically at this moment (time of day pending confirmation). */
export const FINAL_AT = new Date("2026-11-14T12:00:00+02:00");

export const isAuctionClosed = (now: Date = new Date()) => now.getTime() >= FINAL_AT.getTime();

export const CONTACT_EMAIL = "ashmaliuk@kse.org.ua";

// Hosted by Lovable until the original file is added to public/images.
export const RECTOR_PHOTO = "https://brik-wow.lovable.app/__l5e/assets-v1/93b78c26-a5e8-42ca-a91b-3570d517cabf/rector.webp";
