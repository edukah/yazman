import Block from '../pattern/block.js';
import Cursor from './cursor.js';

class Preformatted extends Block {
  constructor (editor, { domNode = null } = {}) {
    super(editor, { tagName: Preformatted.tagName, domNode });
  }

  optimize () {
    super.optimize();

    // getMemCaretPosition() değil çünki burası böyle olmazsa enterle son line oluştur pre içinde karakter girince girilen karaterin başına atıyor.
    // let caretPos = this.editor.selection.getCaretPosition();
    let caretPos = this.editor.selection.getMemCaretPosition();

    const regex = new RegExp(`(\r?\n)$`);  
    if (!regex.test(this.domNode.textContent)) {
      const textContent = this.domNode.textContent.replace(Cursor.content, '') + '\n';

      while (this.domNode.childNodes.length) {
        this.domNode.removeChild(this.domNode.childNodes[0]);
      }

      const textInstance = new this.editor.TEXT_NODE(this.editor, { text: textContent.trim('\n') + '\n' });
      this.domNode.appendChild(textInstance.domNode);
      this.update();

      // chorome backspace tuşu düzeltme normal paragraftan gelirken
      // console.log('1:', caretPos);
      caretPos = this.editor.selection.setMemCaretPosition(caretPos.map(value => {
        if (this.end + 1 === value) {
          return value - 1;
        }

        return value;
      }));
      // console.log('2:', caretPos);
    }

    // firefox backspace tuşuyla paragraptan preformatted'e geri geldiğinde en sona geliyor, biz scrolun \n karakterinden önce durmasını istediğimizden bunu yapıyoruz.
    // caretPos = this.editor.selection.getMemCaretPosition();
    // console.log('3:', caretPos);
    // console.log('----------------');

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

    // console.log(this.domNode.textContent);
    // console.log(this.domNode.nextSibling && this.domNode.nextSibling.__detail && this.domNode.nextSibling.__detail instanceof this.domNode.__detail.constructor);

    if (this.domNode.nextSibling && this.domNode.nextSibling.__detail && this.domNode.nextSibling.__detail instanceof this.domNode.__detail.constructor) {
      const nextSiblingTextContent = this.domNode.nextSibling.textContent ? this.domNode.nextSibling.textContent : '\n';

      // line sonunda pre-pagraf arası yap, o yğzden bunu koyduk.
      // this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition().map(value => this.domNode.nextSibling.__detail.end > value ? value : value - 1));

      this.domNode.firstChild.__detail.insertText(nextSiblingTextContent);
      this.domNode.nextSibling.remove();
    }

    // console.log(this.domNode.previousSibling && this.domNode.previousSibling.__detail && this.domNode.previousSibling.__detail instanceof this.domNode.__detail.constructor);

    /* if (this.domNode.previousSibling && this.domNode.previousSibling.__detail && this.domNode.previousSibling.__detail instanceof this.domNode.__detail.constructor) {
      while (this.domNode.childNodes.length) {
        this.domNode.previousSibling.appendChild(this.domNode.childNodes[0]);
      }

      this.domNode.parentNode.removeChild(this.domNode);
    } */
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

    // pre => başka format olurken pre'den sonraki satır farklı bir format ise satır arası farkı azalacağından ('pre sonundaki \n karakteri budanıyor'), caret rangeyi 1 azaltıyoruz.
    if (this.next && Object.keys(this.next.format)[0] !== Preformatted.formatName && this.end <= endIndex) {
      this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition().map((v, i) => i === 1 ? v - 1 : v));
    }

    // başka formata dönüşmüyorsa buradan dön
    if (!Object.keys(onFormatResult.format.blockFormat).length || (Object.keys(onFormatResult.format.blockFormat).includes(Preformatted.formatName) && onFormatResult.format.blockFormat[Preformatted.formatName])) {
      return onFormatResult;
    }

    /* --------------------- CURSOR REGENERATE ------------------------- */
    // ilk satır dönüşmüyorsa bundan sonra gelen index 1 artıcak. ilk satırdan sonra \n var new line yok, dolayısıyla newline geleceği için bunu yapıyoruz.
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
      // let relStartBorder = lineText.lastIndexOf('\n', relStart - 1); // -1 yapıyoruz çünki \n karakterinin üzerinde yaparsak relEnd ve relStart aynı çıkıyor.
      relStartBorder = lineText.lastIndexOf('\n', (relStart < 1) ? 0 : relStart - 1); // -1 yapıyoruz çünki \n karakterinin üzerinde yaparsak relEnd ve relStart aynı çıkıyor.
      // console.log(relStartBorder);
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

    // console.log(lineText, relStart, relEnd);

    let rangeText = lineText.slice(relStartBorder, relEndBorder);

    // text başındaki ve sonundaki çift \n karkatelerini alıp tek \n karakterine dönüştürüyoruz. satırlar sabit kalıyor böylece. [:linebreak] ile değşitiriyoruz çünki trim ile tek \n karakterlerini buduyoruz.

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

    // console.log(lengthDiff);
    // console.log(lengthDiff);

    // this.editor.deleteContent(absStartBorder, absEndBorder, false);
    // console.log(absStartBorder);

    // insertNode'den sonra caret position'u set edersek üstte kalan preformatted optmizideyi bu scrolla göre yaptığından hatalı oluyor. arada olan boş preformatted satırı paragrafa çevirerek sorun görülebilir.
    /* if (relStartBorder) {
      // this.editor.selection.setMemCaretPosition(this.editor.selection.getMemCaretPosition().map(value => value + 1)); // line break lenfgth;
    } */

    // caret position olduğu gibi kaldığından ve bu poziyonda delete-optimize yapıldığından preformatted optimizesi koşula denk gelen caret scrollu değiştiriyordu bunu önlemek için careti hafızaya alıp 0 ladık. deleteden sonra tekrar eski haline döndürdük.
    const caretPos = this.editor.selection.getMemCaretPosition();
    this.editor.selection.setMemCaretPosition([0, 0]); // line break lenfgth;

    this.editor.deleteContent(absStartBorder, absEndBorder, true); // lineCleaner
    // debugger;
    // console.log(caretPos);
    this.editor.selection.setMemCaretPosition(caretPos.map((v, i) => i === 1 ? v - lengthDiff : v));
    // console.log(this.editor.selection.getMemCaretPosition());

    // console.log(newLines);
    let border = absStartBorder;
    newLines.forEach(v => {
      // console.log(absStartBorder, { textContent: v, format: { ...onFormatResult.format.blockFormat } });
      // absStartBorder = absStartBorder > 0 ? absStartBorder - 1 : 0;
      // absStartBorder = !v.length ? absStartBorder - 1 : absStartBorder;

      this.editor.insertNode({ textContent: v, format: { ...onFormatResult.format.blockFormat } }, border);
      border += (v.length) ? v.length + 1 : 1;
    });

    return false;
  }

  static toolbarListener (event, editor) {
    // pre nin en son line'nını ve ondan sorna gelen paragrafı seçince ve pre styl'ı uygulayınca paragraf kayıyor 1 karater orası burayla ilgli. burası şuan seçili alan içinde line olmadığını varsayıyor.
    const rangeFormat = editor.paper.getFormat(...editor.selection.getMemCaretPosition());

    const [startIndex, endIndex] = editor.selection.getMemCaretPosition();

    const lines = editor.paper.getLines(startIndex, endIndex);

    const startLine = lines[0];
    const startLinePreviousSiblingIsPre = (startLine.domNode.previousSibling && startLine.domNode.previousSibling.__detail instanceof Preformatted);

    /* let firstLineWillFormat = false;
    if (Object.keys(rangeFormat).includes(Preformatted.formatName)) {
      const firstLineBreakIndex = lines[0].start + lines[0].textContent.indexOf('\n');
      if (firstLineBreakIndex >= startIndex) firstLineWillFormat = true;
    } */

    // console.log('careeet:', editor.selection.getMemCaretPosition());
    // preden snra normal paragraf geldiğinde silinen 1 adet paragraf arası boşluk karakterinden dolayı ayarlama yapıyoruz
    // onformatta aynısı var en baştaki.
    /* let borderIndex = 0;
    lines.reduce((acc, line, index) => {
      if (Object.keys(lines[index - 1].format)[0] === Preformatted.formatName && Object.keys(lines[index - 1].format)[0] !== Object.keys(lines[index].format)[0]) {
        return ++borderIndex;
      } else {
        return borderIndex;
      }
    }); */

    // caretpos'u önceden değişkene aldık çünki formatladıkatan sonra optimize'de değiştiriyordu.

    editor.toolbar.listener(event);

    const caretPos = editor.selection.getMemCaretPosition();

    if (!Object.keys(rangeFormat).includes(Preformatted.formatName)) {
      // preformata dönüşücek;
      if (startLinePreviousSiblingIsPre) {
        editor.selection.setMemCaretPosition(caretPos.map((v, i) => v - 1));
      }

      /* if (borderIndex) {
        editor.selection.setMemCaretPosition(caretPos.map((v, i) => i === 1 ? v - borderIndex : v));
      } */
    }

    // onFormatta aynısı var ikinci olan
    /* if (Object.keys(rangeFormat).includes(Preformatted.formatName)) {
      // pre formattan başka bir taga dönüşücek.
      if (!firstLineWillFormat) {
        editor.selection.setMemCaretPosition(caretPos.map((v, i) => v + 1));
      }
    } */

    // ilk koşul; eğer üstteki pre ise satır arası lengt'i gidiyor. onun yerine hiç bir şey eklenmiyor o yüzden pre yaparken üstteki pre ise 1 azalttık.
  }

  /* static toolbarListener(event, editor) {
    // pre nin en son line'nını ve ondan sorna gelen paragrafı seçince ve pre styl'ı uygulayınca paragraf kayıyor 1 karater orası burayla ilgli. burası şuan seçili alan içinde line olmadığını varsayıyor.
    const rangeFormat = editor.paper.getFormat(...editor.selection.getMemCaretPosition());
    const line = editor.paper.getLine(...editor.selection.getMemCaretPosition());
    const linePreviousSiblingIsPre = (line.domNode.previousSibling && line.domNode.previousSibling.__detail instanceof Preformatted);

    editor.toolbar.listener(event);

    if (!Object.keys(rangeFormat).includes(Preformatted.formatName) && linePreviousSiblingIsPre) {
      editor.selection.setMemCaretPosition(editor.selection.getMemCaretPosition().map(v => v - 1));
    }
  } */

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
    // console.log(startIndex);
    // console.log(endIndex);
    /*  Seçili Text varsa sil */
    if (startIndex !== endIndex) {
      editor.deleteContent(startIndex, endIndex);
      editor.selection.setMemCaretPosition([startIndex, startIndex]);
    }
    /* */

    /* ENTER KARATERINI EKLIYOR YENI BIR SATIRA GEÇMEK YERINE */
    const tabChar = `${editor.TEXT_NODE.spaceChar}${editor.TEXT_NODE.spaceChar}`;
    // console.log('startIndex', startIndex);
    // console.log(endIndex);
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
