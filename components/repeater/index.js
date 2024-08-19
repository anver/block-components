import { useBlockEditContext, store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect, dispatch } from '@wordpress/data';
import { cloneElement, forwardRef, useEffect } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { v4 as uuid } from 'uuid';

import { DragHandle } from '../drag-handle';
import { useSortable } from './hooks';

/**
 * The Sortable Item Component.
 *
 * @param {object} props React props
 * @param {Function} props.children Render prop to render the children.
 * @param {object} props.item The repeater item object.
 * @param {Function} props.setItem A function to set state of a repeater item.
 * @param {Function} props.removeItem A function to delete a repeater item.
 * @param {string} props.id A string identifier for a repeater item.
 * @returns {*} React JSX
 */
const SortableItem = forwardRef(
	(
		{
			children,
			item = {},
			setItem = null,
			removeItem = null,
			id = '',
			index,
			onDragStart,
			onDragOver,
			onDragEnd,
		},
		ref,
	) => {
		const repeaterItem = children(item, id, setItem, removeItem);
		const clonedRepeaterChild = cloneElement(
			repeaterItem,
			{
				ref,
				onDragStart: (e) => onDragStart(e, index),
				onDragOver: (e) => onDragOver(e, index),
				onDragEnd: () => onDragEnd(),
				draggable: true,
				style: {
					transition: `transform 0.1s`,
				},
			},
			[<DragHandle className="repeater-item__drag-handle" />, repeaterItem.props.children],
		);

		return clonedRepeaterChild;
	},
);

/**
 * The Repeater Component.
 *
 * @param {object} props React props
 * @param {Function} props.children Render prop to render the children.
 * @param {string} props.addButton render prop to customize the "Add item" button.
 * @param {boolean} props.allowReordering boolean to toggle reordering of Repeater items.
 * @param {Function} props.onChange callback function to update the block attribute.
 * @param {Array} props.value array of Repeater items.
 * @param {Array} props.defaultValue array of default Repeater items.
 * @returns {*} React JSX
 */
export const AbstractRepeater = ({
	children,
	addButton = null,
	allowReordering = false,
	onChange,
	value,
	defaultValue = [],
}) => {
	/**
	 * Adds a new repeater item.
	 */
	function addItem() {
		/*
		 * [...defaultValue] does a shallow copy. To ensure deep-copy,
		 * we do JSON.parse(JSON.stringify()).
		 */
		const defaultValueCopy = JSON.parse(JSON.stringify(defaultValue));

		if (!defaultValue.length) {
			defaultValueCopy.push({});
		}

		defaultValueCopy[0].id = uuid();

		onChange([...value, ...defaultValueCopy]);
	}

	/**
	 * Updates the item currently being edited.
	 *
	 * @param {string|number|boolean} newValue The value that should be used to updated the item.
	 * @param {number} index The index at which the item should be updated.
	 */
	function setItem(newValue, index) {
		/*
		 * [...value] does a shallow copy. To ensure deep-copy,
		 * we do JSON.parse(JSON.stringify()).
		 */
		const valueCopy = JSON.parse(JSON.stringify(value));

		if (typeof newValue === 'object' && newValue !== null) {
			valueCopy[index] = { ...valueCopy[index], ...newValue };
		} else {
			valueCopy[index] = newValue;
		}

		onChange(valueCopy);
	}

	/**
	 * Removes an item from the list.
	 *
	 * @param {number} index The index of the item that needs to be removed.
	 */
	function removeItem(index) {
		const valueCopy = JSON.parse(JSON.stringify(value)).filter(
			(item, innerIndex) => index !== innerIndex,
		);
		onChange(valueCopy);
	}

	const { items, allDraggables, onDragStart, onDragOver, onDragEnd } = useSortable(value);

	useEffect(() => {
		onChange(items);
	}, [items]);

	return (
		<>
			{allowReordering
				? items.map((item, key) => {
						return (
							<SortableItem
								item={item}
								setItem={(val) => setItem(val, key)}
								removeItem={() => removeItem(key)}
								key={item.id}
								id={item.id}
								ref={function (el) {
									allDraggables.current[key] = el;
								}}
								index={key}
								onDragStart={onDragStart}
								onDragOver={onDragOver}
								onDragEnd={onDragEnd}
							>
								{(item, id, setItem, removeItem) => {
									return children(
										item,
										id,
										(val) => setItem(val, key),
										() => removeItem(key),
									);
								}}
							</SortableItem>
						);
					})
				: value.map((item, key) => {
						return children(
							item,
							item.id,
							(val) => setItem(val, key),
							() => removeItem(key),
						);
					})}
			{typeof addButton === 'function' ? (
				addButton(addItem)
			) : (
				<Button variant="primary" onClick={() => addItem()}>
					{__('Add item')}
				</Button>
			)}
		</>
	);
};

export const AttributeRepeater = ({
	children,
	attribute = null,
	addButton = null,
	allowReordering = false,
}) => {
	const { clientId, name } = useBlockEditContext();
	const { updateBlockAttributes } = dispatch(blockEditorStore);

	const attributeValue = useSelect((select) => {
		const attributes = select(blockEditorStore).getBlockAttributes(clientId);
		return attributes[attribute] || [];
	});

	const { defaultRepeaterData } = useSelect((select) => {
		return {
			defaultRepeaterData:
				select(blocksStore).getBlockType(name).attributes[attribute].default,
		};
	});

	if (defaultRepeaterData.length) {
		defaultRepeaterData[0].id = uuid();
	}

	const handleOnChange = (value) => {
		updateBlockAttributes(clientId, { [attribute]: value });
	};

	return (
		<AbstractRepeater
			addButton={addButton}
			allowReordering={allowReordering}
			onChange={handleOnChange}
			value={attributeValue}
			defaultValue={defaultRepeaterData}
		>
			{children}
		</AbstractRepeater>
	);
};

export const Repeater = ({
	children,
	addButton = null,
	allowReordering = false,
	onChange,
	value,
	defaultValue = [],
	attribute = null,
}) => {
	if (attribute) {
		return (
			<AttributeRepeater
				attribute={attribute}
				addButton={addButton}
				allowReordering={allowReordering}
			>
				{children}
			</AttributeRepeater>
		);
	}

	return (
		<AbstractRepeater
			addButton={addButton}
			allowReordering={allowReordering}
			onChange={onChange}
			value={value}
			defaultValue={defaultValue}
		>
			{children}
		</AbstractRepeater>
	);
};
