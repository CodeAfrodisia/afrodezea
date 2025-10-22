export function getBehaviorScore(i) {
    return (
        (i.repurchases ?? 0) * 3 +
        (i.wishlist_saves ?? 0) * 2 +
        (i.views ?? 0) +
        (i.affirmations_saved ?? 0) * 2 +
        (i.shared ?? 0) * 3
    )
}

