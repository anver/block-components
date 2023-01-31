/**
 * External dependencies
 */
import classnames from 'classnames';
import styled from '@emotion/styled';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef } from '@wordpress/element';
import { Popover, Icon, Tooltip } from '@wordpress/components';
import { __experimentalLinkControl as LinkControl, RichText } from '@wordpress/block-editor';

/**
 * Internal Dependencies
 */
import { useOnClickOutside } from '../../hooks/use-on-click-outside';
import React from 'react';
import type { FC } from 'react';

/**
 * Given the Link block's type attribute, return the query params to give to
 * /wp/v2/search.
 *
 * @param {string} type Link block's type attribute.
 * @param {string} kind Link block's entity of kind (post-type|taxonomy)
 * @returns {{ type?: string, subtype?: string }} Search query params.
 */
function getSuggestionsQuery(type: string, kind: string) {
	switch (type) {
		case 'post':
		case 'page':
			return { type: 'post', subtype: type };
		case 'category':
			return { type: 'term', subtype: 'category' };
		case 'tag':
			return { type: 'term', subtype: 'post_tag' };
		case 'post_format':
			return { type: 'post-format' };
		default:
			if (kind === 'taxonomy') {
				return { type: 'term', subtype: type };
			}
			if (kind === 'post-type') {
				return { type: 'post', subtype: type };
			}
			return {};
	}
}

const StylesRichTextLink = styled(RichText)`
	--color--warning: #f00;

	/* Reset margins for this block alone. */
	--global--spacing-vertical: 0;
	--global--spacing-vertical: 0;

	color: var(--wp--style--color--link);
	position: relative;
	display: block;
	align-items: center;
	gap: 0.5em;
	text-decoration: underline;

	/* This holds the text URL input */
	& > div {
		text-decoration: underline;
	}

	.dashicon {
		text-decoration: none;
		font-size: 1em;
		width: 1.5em;
		height: 1.5em;
		border-radius: 50%;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color--warning);
	}
`;

type LinkProps = {
	/**
	 * The text to show inside the link
	 */
	value: string;
	/**
	 * The URL to link to
	 */
	url: string;
	/**
	 * Callback when the URL is changed
	 */
	onLinkChange: (value: { url: string; opensInNewTab: boolean, title: string }) => void;
	/**
	 * Callback when the URL is changed
	 */
	onLinkRemove: () => void;
	/**
	 * Callback when the link's text is changed
	 */
	onTextChange: (value: string) => void;
	/**
	 * Should the link open in a new tab?
	 */
	opensInNewTab: boolean;
	/**
	 * Post or Page, used to autosuggest content for URL
	 */
	type: string;
	/**
	 * Page or Post
	 */
	kind: string;
	/**
	 * html class to be applied to the anchor element
	 */
	className: string;
	/**
	 * Text visible before actual value is inserted
	 */
	placeholder: string;

	/**
	 * All other props passed to the component
	 */
	[key: string]: any;
};

/**
 * Link component that can be used inside other Gutenberg blocks for setting up URLs.
 *
 * The link should not be visible if the block is not focused. This will maintain nicer
 * visuals in the block editor as a whole.43a (start refactor to typescript):components/link/index.tsx
 */
const Link: FC<LinkProps> = ({
	value,
	type,
	opensInNewTab,
	url,
	onLinkChange,
	onTextChange,
	onLinkRemove,
	kind,
	placeholder,
	className,
	...rest
}) => {
	const [isPopoverVisible, setIsPopoverVisible] = useState(false);
	const [isValidLink, setIsValidLink] = useState(false);
	const openPopover = () => setIsPopoverVisible(true);
	const closePopover = () => setIsPopoverVisible(false);

	const linkRef = useRef();
	const popoverRef = useOnClickOutside(closePopover);

	const link = {
		url,
		opensInNewTab,
		title: value, // don't allow HTML to display inside the <LinkControl>
	};

	/**
	 * Check if the URL and Value are set. If yes, then the component is valid.
	 * Otherwise, we will output a visual reminder to the editor that one of the
	 * two needs to be set.
	 */
	useEffect(() => {
		setIsValidLink(!!url && !!value);
	}, [url, value]);

	return (
		<>
			<StylesRichTextLink
				tagName="a"
				className={classnames('tenup-block-components-link__label', className)}
				value={value}
				onChange={onTextChange}
				aria-label={__('Link text', '10up-block-components')}
				placeholder={placeholder}
				__unstablePastePlainText
				allowedFormats={[]}
				onClick={openPopover}
				ref={linkRef}
				{...rest}
			/>

			{!isValidLink && (
				<Tooltip text={__('URL or Text has not been set', '10up-block-components')}>
					{/*
					 * This additional span is needed to prevent an issue with how the Tooltip tries
					 * to pass a ref to the Icon component. The Icon component is a functional
					 * component and does not accept a ref.
					 *
					 * @see https://github.com/WordPress/gutenberg/issues/43129
					 */}
					<span>
						<Icon icon="warning" />
					</span>
				</Tooltip>
			)}

			{isPopoverVisible && (
				<Popover
					anchorRef={linkRef.current}
					anchor={linkRef.current}
					ref={popoverRef}
					focusOnMount={false}
				>
					<LinkControl
						hasTextControl
						className="tenup-block-components-link__link-control"
						value={link}
						showInitialSuggestions
						noDirectEntry={!!type}
						noURLSuggestion={!!type}
						suggestionsQuery={getSuggestionsQuery(type, kind)}
						onChange={onLinkChange}
						onRemove={onLinkRemove}
						settings={[
							{
								id: 'opensInNewTab',
								title: __('Open in new tab', '10up-block-components'),
							},
						]}
					/>
				</Popover>
			)}
		</>
	);
};

export { Link };
