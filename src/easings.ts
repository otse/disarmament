namespace easings {

	export function easeOutBounce(x: number): number {
		const n1 = 7.5625;
		const d1 = 2.75;

		if (x < 1 / d1) {
			return n1 * x * x;
		} else if (x < 2 / d1) {
			return n1 * (x -= 1.5 / d1) * x + 0.75;
		} else if (x < 2.5 / d1) {
			return n1 * (x -= 2.25 / d1) * x + 0.9375;
		} else {
			return n1 * (x -= 2.625 / d1) * x + 0.984375;
		}
	}

	export function easeInBounce(x: number): number {
		return 1 - easeOutBounce(1 - x);
	}

	export function easeInOutElastic(x: number): number {
		const c5 = (2 * Math.PI) / 4.5;

		return x === 0
			? 0
			: x === 1
				? 1
				: x < 0.5
					? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2
					: (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1;
	}

	export function easeInCubic(x: number): number {
		return x * x * x;
	}
}

export default easings;