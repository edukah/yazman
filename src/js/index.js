import Yazman from './engine/editor.js';

import Toolbar from './module/toolbar.js';
import Dialog from './module/dialog.js';

import Container from './pattern/container.js';
import Block, { BlockEmbed } from './pattern/block.js';
import Inline, { InlineEmbed } from './pattern/inline.js';

import Image from './format/image.js';
import { Figure, FigureImage, Figcaption } from './format/figure.js';

import Paragraph from './format/paragraph.js';
import { HeaderTwo, HeaderThree } from './format/header.js';
import Preformatted from './format/preformatted.js';
import Blockquote from './format/blockquote.js';
import { ListItem, OrderedList, UnorderedList } from './format/list.js';

import Text from './format/text.js';
import Hyperlink from './format/hyperlink.js';
import Bold from './format/bold.js';
import Italic from './format/italic.js';
import { Subscript, Supscript } from './format/script.js';
import Break from './format/break.js';
import Cursor from './format/cursor.js';

Yazman.register('module/toolbar', Toolbar);
Yazman.register('module/dialog', Dialog);

Yazman.register('pattern/container', Container);
Yazman.register('pattern/block', Block);
Yazman.register('pattern/blockEmbed', BlockEmbed);
Yazman.register('pattern/inline', Inline);
Yazman.register('pattern/inlineEmbed', InlineEmbed);

Yazman.register('format/image', Image);
Yazman.register('format/figure', Figure);
Yazman.register('format/figureImage', FigureImage);
Yazman.register('format/figcaption', Figcaption);

Yazman.register('format/paragraph', Paragraph);
Yazman.register('format/headerTwo', HeaderTwo);
Yazman.register('format/headerThree', HeaderThree);
Yazman.register('format/preformatted', Preformatted);
Yazman.register('format/blockquote', Blockquote);
Yazman.register('format/listItem', ListItem);
Yazman.register('format/orderedList', OrderedList);
Yazman.register('format/unorderedList', UnorderedList);

Yazman.register('format/text', Text);
Yazman.register('format/hyperlink', Hyperlink);
Yazman.register('format/bold', Bold);
Yazman.register('format/italic', Italic);
Yazman.register('format/subscript', Subscript);
Yazman.register('format/supscript', Supscript);
Yazman.register('format/break', Break);
Yazman.register('format/cursor', Cursor);

export default Yazman;
