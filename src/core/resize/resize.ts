export function resize(
    gameWidth: number,
    gameHeight: number,
    minWidth: number,
    minHeight: number,
    preserveAspectRatio: boolean = true
) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Minimum boyutları uygula
    let width = Math.max(minWidth, windowWidth);
    let height = Math.max(minHeight, windowHeight);

    if (preserveAspectRatio) {
        // Aspect ratio'yu koru
        const ratio = Math.min(width / gameWidth, height / gameHeight);
        width = gameWidth * ratio;
        height = gameHeight * ratio;
    }

    return {
        width,
        height,
    };
}
