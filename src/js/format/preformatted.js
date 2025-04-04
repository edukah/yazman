import Block from '../pattern/block.js';
import Cursor from './cursor.js';

class Preformatted extends Block {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Preformatted.tagName, domNode });
  }

  optimize () {
    super.optimize();

    // getMemCaretPosition() değil, çünkü burası böyle olmazsa enterle son line oluştur, pre içinde karakter girince girilen karakterin başına atıyor.
    let caretPos = this.editor.selection.getMemCaretPosition();

    const regex = new RegExp(`(\r?\n)$`);
    if (!regex.test(this.domNode.textContent)) {
      const textContent = this.domNode.textContent.replace(Cursor.content, '') + '\n';

      while (this.domNode.childNodes.length) {
        this.domNode.removeChild(this.domNode.childNodes[0]);
      }

      const textInstance = new this.editor.TEXT_NODE(this.editor, { text: textContent.replace(/^\n+|\n+$/g, '') + '\n' });
      this.domNode.appendChild(textInstance.domNode);
      this.update();

      // Chrome backspace tuşu düzeltme, normal paragraftan gelirken
      caretPos = this.editor.selection.setMemCaretPosition(caretPos.map(value => {
        if (this.end + 1 === value) {
          return value - 1;
        }

        return value;
      }));
    }

    // Firefox backspace tuşuyla paragraftan preformatted'e geri geldiğinde en sona geliyor; biz scroll'un \n karakterinden önce durmasını istediğimizden bunu yapıyoruz.
    if (caretPos[1] === this.end) {
      this.editor.selection.setMemCaretPosition(caretPos.map(value => {
        if (this.end === value) {
          return value - 1;
        }

        return value;
      }));
    }

    if (!this.domNode.textContent.length) {
      this.domNode.innerHTML = '\n';
    }

    if (this.domNode.nextSibling && this.domNode.nextSibling.__detail && this.domNode.nextSibling.__detail instanceof this.domNode.__detail.constructor) {
      const nextSiblingTextContent = this.domNode.nextSibling.textContent ? this.domNode.nextSibling.textContent : '\n';

      // Line sonunda pre-paragraf arası yap, o yüzden bunu koyduk.
      this.domNode.firstChild.__detail.insertText(nextSiblingTextContent);
      this.domNode.nextSibling.remove();
    }
  }

  onInsert ({ blockFormat = {}, inlineFormat = {} }, index) {
    const onInsertResult = super.onInsert({ blockFormat, inlineFormat }, index);
    const relIndex = Math.abs(index - this.domNode.firstChild.__detail.start);
    const lineText = this.domNode.firstChild.__detail.getText();
    const nextLineBreak = lineText.indexOf('\n', relIndex);

    if (this.start !== index && relIndex === nextLineBreak && Object.keys(blockFormat).length) {
      index++;
    }

    return { format: onInsertResult.format, index };
  }

  onFormat ({ blockFormat = {}, inlineFormat = {} }, caretRange) {
    const onFormatResult = super.onFormat({ blockFormat, inlineFormat }, caretRange);
    const [startIndex, endIndex] = onFormatResult.caretRange;

    // Pre => başka format olurken pre'den sonraki satır farklı bir format ise, satır arası farkı azalacağından ('pre sonundaki \n karakteri budanıyor'), caret range'yi 1 azaltıyoruz.
    if (this.next && Object.keys(this.next.format)[0] !== Preformatted.formatName && this.end <= endIndex) {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition().map((v, i) => i === 1 ? v - 1 : v));
    }

    // Başka formata dönüşmüyorsa buradan dön.
    if (!Object.keys(onFormatResult.format.blockFormat).length || (Object.keys(onFormatResult.format.blockFormat).includes(Preformatted.formatName) && onFormatResult.format.blockFormat[Preformatted.formatName])) {
      return onFormatResult;
    }

    /* --------------------- CURSOR REGENERATE ------------------------- */
    // İlk satır dönüşmüyorsa bundan sonra gelen index 1 artacak. İlk satırdan sonra \n var new line yok, dolayısıyla newline geleceği için bunu yapıyoruz.
    const firstLineBreakIndex = this.start + this.textContent.indexOf('\n');
    const firstLineWillFormat = firstLineBreakIndex >= startIndex;

    if (!firstLineWillFormat) {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition().map((v, i) => v + 1));
    }
    /* --------------------- END OF CURSOR REGENERATE ------------------------- */

    delete onFormatResult.format.blockFormat[Preformatted.formatName];
    if (!Object.keys(onFormatResult.format.blockFormat).length) {
      Object.assign(onFormatResult.format.blockFormat, { paragraph: true });
    }

    const lineText = this.domNode.firstChild.__detail.getText();

    let absStartBorder = this.domNode.__detail.start;
    let relStartBorder = 0;
    if (startIndex > this.domNode.firstChild.__detail.start) {
      const relStart = Math.abs(startIndex - this.domNode.firstChild.__detail.start);
      relStartBorder = lineText.lastIndexOf('\n', (relStart < 1) ? 0 : relStart - 1); // -1 yapıyoruz, çünkü \n karakterinin üzerinde yaparsak relEnd ve relStart aynı çıkıyor.
      relStartBorder = (relStartBorder <= 0) ? 0 : relStartBorder + 1;
      absStartBorder = this.domNode.__detail.start + relStartBorder;
    }

    let absEndBorder = this.domNode.__detail.end;
    let relEndBorder = lineText.length;
    if (endIndex < this.domNode.__detail.end) {
      const relEnd = Math.abs(endIndex - this.domNode.firstChild.__detail.start);
      relEndBorder = lineText.indexOf('\n', relEnd) + 1;
      absEndBorder = this.domNode.__detail.start + relEndBorder;
    }

    let rangeText = lineText.slice(relStartBorder, relEndBorder);

    // Text başındaki ve sonundaki çift \n karakterlerini alıp tek \n karakterine dönüştürüyoruz. Satırlar sabit kalıyor böylece. [:linebreak] ile değiştiriyoruz, çünkü trim ile tek \n karakterlerini buduyoruz.

    rangeText = rangeText.replace(/^\n+|\n+$/g, function (match) {
      return match.replace(/\n{2}/mg, '[:linebreak]').trim();
    }).replace(/\[:linebreak\]/mg, '\n');

    let lengthDiff = 0;
    const newLines = rangeText.split('\n').map(v => {
      const beforeLength = v.length;
      v = v.trim();
      const afterLength = v.length;

      lengthDiff += beforeLength - afterLength;

      return v;
    });

    // Caret position olduğu gibi kaldığından ve bu pozisyonda delete-optimize yapıldığından, preformatted optimize'si koşula denk gelen caret scroll'u değiştiriyordu. Bunu önlemek için caret'i hafızaya alıp 0'ladık. Delete'den sonra tekrar eski haline döndürdük.
    const caretPos = this.editor.selection.getMemCaretPosition();
    this.editor.selection.setMemCaretPosition([0, 0]); // line break lenfgth;

    this.editor.deleteContent(absStartBorder, absEndBorder, true); // lineCleaner
    this.editor.selection.setMemCaretPosition(caretPos.map((v, i) => i === 1 ? v - lengthDiff : v));

    let border = absStartBorder;
    newLines.forEach(v => {
      this.editor.insertNode({ textContent: v, format: { ...onFormatResult.format.blockFormat } }, border);
      border += (v.length) ? v.length + 1 : 1;
    });

    return false;
  }

  static toolbarListener (event, editor) {
    // Pre'nin en son line'ını ve ondan sonra gelen paragrafı seçince ve pre style'ı uygulayınca paragraf 1 karakter kayıyor, orası burayla ilgili. Burası şu an seçili alan içinde line olmadığını varsayıyor.
    const rangeFormat = editor.paper.getFormat(...editor.selection.getMemCaretPosition());

    const [startIndex, endIndex] = editor.selection.getMemCaretPosition();

    const lines = editor.paper.getLines(startIndex, endIndex);

    const startLine = lines[0];
    const startLinePreviousSiblingIsPre = (startLine.domNode.previousSibling && startLine.domNode.previousSibling.__detail instanceof Preformatted);

    // caretPos'u önceden değişkene aldık, çünkü formatladıktan sonra optimize'de değiştiriyordu.

    editor.toolbar.listener(event);

    const caretPos = editor.selection.getMemCaretPosition();

    if (!Object.keys(rangeFormat).includes(Preformatted.formatName)) {
      // preformata dönüşücek;
      if (startLinePreviousSiblingIsPre) {
        editor.selection.setMemCaretPosition(caretPos.map((v, i) => v - 1));
      }
    }

    // İlk koşul: eğer üstteki pre ise satır arası length'i gidiyor. Onun yerine hiçbir şey eklenmiyor, o yüzden pre yaparken üstteki pre ise 1 azalttık.
  }

  static enterKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (lines[0] instanceof Preformatted) {
      /* ARD ARDA 4 VE UZERI ENTER GELIRSE BUNU DUZELTIYOR */
      const regex = new RegExp(`(\r?\n){3,}$`);
      if (regex.test(lines[0].textContent)) {
        const textContent = lines[0].textContent;
        lines[0].children[0].updateText(textContent.trim() + '\n');

        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value - '\n'.length * 2));

        editor.insertNode({ format: { paragraph: true } }, lines[0].end);
        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value + '\n'.length + 1));

        event.preventDefault();

        return false;
      }

      /*  Seçili Text varsa sil */
      if (startIndex !== endIndex) {
        editor.deleteContent(startIndex, endIndex);
        editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => startIndex));
      }
      /* */

      /* ENTER KARATERINI EKLIYOR YENI BIR SATIRA GEÇMEK YERINE */
      editor.insertNode({ textContent: '\n' }, startIndex);
      editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(value => value + '\n'.length));
      /* SON */

      event.preventDefault();

      return false;
    }
  }

  static tabKeyHandler (event, editor, { lines, startIndex, endIndex }) {
    if (!lines.length || !(lines[0] instanceof Preformatted)) return;

    /*  Seçili Text varsa sil */
    if (startIndex !== endIndex) {
      editor.deleteContent(startIndex, endIndex);
      editor.selection.setMemCaretPosition([startIndex, startIndex]);
    }
    /* */

    /* ENTER KARATERINI EKLIYOR YENI BIR SATIRA GEÇMEK YERINE */
    const tabChar = `${editor.TEXT_NODE.spaceChar}${editor.TEXT_NODE.spaceChar}`;
    editor.insertNode({ textContent: tabChar }, startIndex);
    editor.selection.setMemCaretPosition([startIndex + tabChar.length, startIndex + tabChar.length]);
    /* SON */

    event.preventDefault();

    return false;
  }
}

Preformatted.tagName = 'PRE';
Preformatted.formatName = 'preformatted';
Preformatted.toolbar = '<svg version="1.1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m9.08398 3.5-9.08398 12.5 9.08398 12.5 4.16602-3.02734-6.88477-9.47266 6.88477-9.47266-4.16602-3.02734zm13.832 0-4.16602 3.02734 6.88477 9.47266-6.88477 9.47266 4.16602 3.02734 9.08398-12.5-9.08398-12.5z" style="paint-order:markers fill stroke"/></svg>';
Preformatted.allowedInlineFormat = [];
Preformatted.EVENT = [{ type: 'keydown', keyCode: 9, function: Preformatted.tabKeyHandler }, { type: 'keydown', keyCode: 13, function: Preformatted.enterKeyHandler }];

export default Preformatted;
