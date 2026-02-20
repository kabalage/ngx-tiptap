import {
  AfterViewInit, ChangeDetectorRef, Directive, ElementRef, forwardRef, OnInit, Renderer2, inject,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Content, Editor, type EditorEvents } from '@tiptap/core';
import type {} from '@tiptap/markdown';

@Directive({
  selector: 'tiptap[editor], [tiptap][editor], tiptap-editor[editor], [tiptapEditor][editor]',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TiptapEditorDirective),
    multi: true,
  }],
})

export class TiptapEditorDirective implements OnInit, AfterViewInit, ControlValueAccessor {
  protected elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  protected renderer = inject(Renderer2);
  protected changeDetectorRef = inject(ChangeDetectorRef);

  readonly editor = input.required<Editor>();
  readonly outputFormat = input<'json' | 'html' | 'markdown'>('html');

  protected onChange: (value: Content) => void = () => { /** */ };
  protected onTouched: () => void = () => { /** */ };

  // Writes a new value to the element.
  // This methods is called when programmatic changes from model to view are requested.
  writeValue(value: Content): void {
    this.editor().chain().setContent(value, {
      emitUpdate: false,
      contentType: this.getContentType(),
    }).run();
  }

  // Registers a callback function that is called when the control's value changes in the UI.
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  // Registers a callback function that is called by the forms API on initialization to update the form model on blur.
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Called by the forms api to enable or disable the element
  setDisabledState(isDisabled: boolean): void {
    this.editor().setEditable(!isDisabled);
    this.renderer.setProperty(this.elRef.nativeElement, 'disabled', isDisabled);
  }

  protected handleChange = ({ editor, transaction }: EditorEvents['transaction']): void => {
    if (!transaction.docChanged) {
      return;
    }

    // Needed for ChangeDetectionStrategy.OnPush to get notified about changes
    this.changeDetectorRef.markForCheck();

    if (this.getContentType()=== 'html') {
      this.onChange(editor.getHTML());
      return;
    } else if (this.getContentType() === 'markdown') {
      this.onChange(editor.getMarkdown());
      return
    }

    this.onChange(editor.getJSON());
  };

  private getContentType() {
    return this.editor().options.contentType || this.outputFormat();
  }

  ngOnInit(): void {
    const editor = this.editor();

    // take the inner contents and clear the block
    const { innerHTML } = this.elRef.nativeElement;
    this.elRef.nativeElement.innerHTML = '';

    // insert the editor in the dom
    editor.mount(this.elRef.nativeElement);

    // update the options for the editor
    editor.setOptions({ element: this.elRef.nativeElement });

    // update content to the editor
    if (innerHTML && this.getContentType() === 'html') {
      editor.chain().setContent(innerHTML, {
        emitUpdate: false,
        contentType: 'html',
      }).run();
    }

    // register blur handler to update `touched` property
    editor.on('blur', () => {
      this.onTouched();
    });

    // register update handler to listen to changes on update
    editor.on('update', this.handleChange);

    // Needed for ChangeDetectionStrategy.OnPush to get notified
    editor.on('selectionUpdate', () => this.changeDetectorRef.markForCheck());
  }

  ngAfterViewInit(): void {
    this.changeDetectorRef.detectChanges();
  }
}
