import { useEffect, useState, useRef } from '@wordpress/element';

export function useSortable(state = []) {
	const [items, setItems] = useState(state);
	const [elementBeingDragged, setElementBeingDragged] = useState(null);
	const [elementBeingDraggedIndex, setElementBeingDraggedIndex] = useState(null);
	const [possibleDropTargetIndex, setPossibleDropTargetIndex] = useState(false);
	const allDraggables = useRef([]);

	function moveElements(arr, fromIndex, toIndex) {
		arr.splice(toIndex, 0, arr.splice(fromIndex, 1)[0]);
		return arr;
	}

	function resetClasses(from, to) {
		const __draggables = allDraggables.current.filter(Boolean);

		for (let i = from; i <= to; i++) {
			__draggables[i].classList.remove('move-up', 'move-down', 'repeater-item--is-dragging');
		}
	}

	function pushElements(from, to, direction = 'down') {
		const __draggables = allDraggables.current.filter(Boolean);

		for (let i = from; i <= to; i++) {
			__draggables[i].classList.add(`move-${direction}`);
		}
	}

	function onDragStart(e, index) {
		setElementBeingDragged(e.target);
		setElementBeingDraggedIndex(index);
	}

	function onDragEnd() {
		if (elementBeingDragged) {
			elementBeingDragged.classList.remove('repeater-item--is-dragging');
		}

		setElementBeingDragged(null);
		setElementBeingDraggedIndex(null);

		if (possibleDropTargetIndex !== false) {
			let __items = [...items];
			__items = moveElements(__items, elementBeingDraggedIndex, possibleDropTargetIndex);
			resetClasses(0, items.length - 1);
			setItems(__items);
		}
	}

	function onDragOver(e, index) {
		e.preventDefault();

		const possibleDropTargetEl = e.target;
		const possibleDropTargetElBounding = possibleDropTargetEl.getBoundingClientRect();
		const __draggables = allDraggables.current.filter(Boolean) || [];

		const mid = (possibleDropTargetElBounding.y + possibleDropTargetElBounding.bottom) / 2;

		// Being moved from down to up.
		if (elementBeingDraggedIndex > index) {
			if (e.clientY < mid) {
				resetClasses(0, index - 1);
				pushElements(index, elementBeingDraggedIndex - 1);
			} else {
				resetClasses(0, index);
			}
		}

		// Being moved from up to down.
		if (elementBeingDraggedIndex < index) {
			if (e.clientY > mid) {
				resetClasses(index, __draggables.length - 1);
				pushElements(elementBeingDraggedIndex + 1, index, 'up');
			} else {
				resetClasses(index, __draggables.length - 1);
			}
		}

		if (index === elementBeingDraggedIndex) {
			return;
		}

		if (elementBeingDraggedIndex > index) {
			if (e.clientY > mid) {
				setPossibleDropTargetIndex(index + 1);
			} else {
				setPossibleDropTargetIndex(index);
			}
		} else if (e.clientY > mid) {
			setPossibleDropTargetIndex(index);
		} else {
			setPossibleDropTargetIndex(index - 1);
		}
	}

	useEffect(() => {
		if (state) {
			setItems(state);
		}
	}, [state]);

	useEffect(() => {
		if (elementBeingDragged) {
			elementBeingDragged.classList.add('repeater-item--is-dragging');
		}
	}, [elementBeingDragged]);

	useEffect(() => {
		const parentElement = allDraggables.current.filter(Boolean)[0]?.parentNode;

		if (!parentElement) {
			return () => null;
		}

		const handleDragOver = (e) => e.preventDefault();

		parentElement.addEventListener('dragover', handleDragOver);

		// Cleanup function
		return () => parentElement.removeEventListener('dragover', handleDragOver);
	}, [allDraggables]);

	useEffect(() => {
		if (document.getElementById('10up-bc-repeater-styles')) {
			return () => null;
		}

		const style = document.createElement('style');
		style.id = '10up-bc-repeater-styles';
		style.textContent = `
			.repeater-item--is-dragging {
				transform: scale(0);
			}

			.move-down {
				position: relative;
				transform: translateY( 36px );
			}

			.move-up {
				position: relative;
				transform: translateY( -36px );
			}
		`;

		// Append the <style> element to the document head
		document.head.appendChild(style);

		return () => document.head.removeChild(style);
	}, []);

	return {
		items,
		allDraggables,
		onDragStart,
		onDragOver,
		onDragEnd,
	};
}
