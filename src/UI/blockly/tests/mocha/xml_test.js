/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

suite('XML', function() {
  var assertSimpleFieldDom = function(fieldDom, name, text) {
    chai.assert.equal(text, fieldDom.textContent);
    chai.assert.equal(name, fieldDom.getAttribute('name'));
  };
  var assertNonSerializingFieldDom = function(fieldDom) {
    chai.assert.isUndefined(fieldDom.childNodes[0]);
  };
  var assertNonVariableField = function(fieldDom, name, text) {
    assertSimpleFieldDom(fieldDom, name, text);
    chai.assert.isNull(fieldDom.getAttribute('id'), 'id');
    chai.assert.isNull(fieldDom.getAttribute('variabletype'), 'variabletype');
  };
  var assertVariableDomField = function(fieldDom, name, type, id, text) {
    assertSimpleFieldDom(fieldDom, name, text);
    chai.assert.equal(fieldDom.getAttribute('variabletype'), type);
    chai.assert.equal(fieldDom.getAttribute('id'), id);
  };
  var assertVariableDom = function(fieldDom, type, id, text) {
    chai.assert.equal(fieldDom.getAttribute('type'), type);
    chai.assert.equal(fieldDom.getAttribute('id'), id);
    chai.assert.equal(fieldDom.textContent, text);
  };
  setup(function() {
    Blockly.defineBlocksWithJsonArray([
      {
        "type": "empty_block",
        "message0": "",
        "args0": []
      },
    ]);
    this.blockTypes_ = ['empty_block'];
    this.complexXmlText = [
      '<xml xmlns="https://developers.google.com/blockly/xml">',
      '  <block type="controls_repeat_ext" inline="true" x="21" y="23">',
      '    <value name="TIMES">',
      '      <block type="math_number">',
      '        <field name="NUM">10</field>',
      '      </block>',
      '    </value>',
      '    <statement name="DO">',
      '      <block type="variables_set" inline="true">',
      '        <field name="VAR">item</field>',
      '        <value name="VALUE">',
      '          <block type="lists_create_empty"></block>',
      '        </value>',
      '        <next>',
      '          <block type="text_print" inline="false">',
      '            <value name="TEXT">',
      '              <block type="text">',
      '                <field name="TEXT">Hello</field>',
      '              </block>',
      '            </value>',
      '          </block>',
      '        </next>',
      '      </block>',
      '    </statement>',
      '  </block>',
      '</xml>'].join('\n');
  });
  teardown(function() {
    for (var i = 0; i < this.blockTypes_.length; i++) {
      delete Blockly.Blocks[this.blockTypes_[i]];
    }
    this.blockTypes_.length = 0;
    // Clear Blockly.Event state.
    Blockly.Events.setGroup(false);
    Blockly.Events.disabled_ = 0;
    sinon.restore();
  });
  suite('textToDom', function() {
    test('Basic', function() {
      var dom = Blockly.Xml.textToDom(this.complexXmlText);
      chai.assert.equal(dom.nodeName, 'xml', 'XML tag');
      chai.assert.equal(dom.getElementsByTagName('block').length, 6, 'Block tags');
    });
  });
  suite('blockToDom', function() {
    setup(function() {
      this.workspace = new Blockly.Workspace();
    });
    teardown(function() {
      this.workspace.dispose();
    });
    suite('Fields', function() {
      test('Angle', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_angle_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_angle",
              "name": "ANGLE",
              "angle": 90
            }
          ],
        }]);
        this.blockTypes_.push('field_angle_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_angle_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
        assertNonVariableField(resultFieldDom, 'ANGLE', '90');
      });
      test('Checkbox', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_checkbox_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_checkbox",
              "name": "CHECKBOX",
              "checked": true
            }
          ],
        }]);
        this.blockTypes_.push('field_checkbox_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_checkbox_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
        assertNonVariableField(resultFieldDom, 'CHECKBOX', 'TRUE');
      });
      test('Colour', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_colour_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_colour",
              "name": "COLOUR",
              "colour": '#000099'
            }
          ],
        }]);
        this.blockTypes_.push('field_colour_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_colour_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
        assertNonVariableField(resultFieldDom, 'COLOUR', '#000099');
      });
      test('Dropdown', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_dropdown_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_dropdown",
              "name": "DROPDOWN",
              "options": [
                [
                  "a",
                  "A"
                ],
                [
                  "b",
                  "B"
                ],
                [
                  "c",
                  "C"
                ]
              ]
            }
          ],
        }]);
        this.blockTypes_.push('field_dropdown_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_dropdown_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
        assertNonVariableField(resultFieldDom, 'DROPDOWN', 'A');
      });
      test('Image', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_image_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_image",
              "name": "IMAGE",
              "src": "https://blockly-demo.appspot.com/static/tests/media/a.png",
              "width": 32,
              "height": 32,
              "alt": "A"
            }
          ],
        }]);
        this.blockTypes_.push('field_image_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_image_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block);
        assertNonSerializingFieldDom(resultFieldDom);
      });
      test('Label', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_label_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_label",
              "name": "LABEL",
              "text": "default"
            }
          ],
        }]);
        this.blockTypes_.push('field_label_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_label_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block);
        assertNonSerializingFieldDom(resultFieldDom);
      });
      test('Label Serializable', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_label_serializable_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_label_serializable",
              "name": "LABEL",
              "text": "default"
            }
          ],
        }]);
        this.blockTypes_.push('field_label_serializable_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_label_serializable_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
        assertNonVariableField(resultFieldDom, 'LABEL', 'default');
      });
      test('Number', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_number_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_number",
              "name": "NUMBER",
              "value": 97
            }
          ],
        }]);
        this.blockTypes_.push('field_number_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_number_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
        assertNonVariableField(resultFieldDom, 'NUMBER', '97');
      });
      test('Text Input', function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": "field_text_input_test_block",
          "message0": "%1",
          "args0": [
            {
              "type": "field_input",
              "name": "TEXT",
              "text": "default"
            }
          ],
        }]);
        this.blockTypes_.push('field_text_input_test_block');
        var block = new Blockly.Block(this.workspace,
            'field_text_input_test_block');
        var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
        assertNonVariableField(resultFieldDom, 'TEXT', 'default');
      });
      suite('Variable Fields', function() {
        setup(function() {
          Blockly.defineBlocksWithJsonArray([{
            'type': 'field_variable_test_block',
            'message0': '%1',
            'args0': [
              {
                'type': 'field_variable',
                'name': 'VAR',
                'variable': 'item'
              }
            ]
          }]);
          this.blockTypes_.push('field_variable_test_block');
        });
        test('Variable Trivial', function() {
          this.workspace.createVariable('name1', '', 'id1');
          var block = new Blockly.Block(this.workspace,
              'field_variable_test_block');
          block.inputList[0].fieldRow[0].setValue('id1');
          var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
          assertVariableDomField(resultFieldDom, 'VAR', null, 'id1', 'name1');
        });
        test('Variable Typed', function() {
          this.workspace.createVariable('name1', 'string', 'id1');
          var block = new Blockly.Block(this.workspace,
              'field_variable_test_block');
          block.inputList[0].fieldRow[0].setValue('id1');
          var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
          assertVariableDomField(resultFieldDom, 'VAR', 'string', 'id1', 'name1');
        });
        test('Variable Default Case', function() {
          sinon.stub(Blockly.utils, 'genUid').returns('1');
          this.workspace.createVariable('name1');

          Blockly.Events.disable();
          var block = new Blockly.Block(this.workspace,
              'field_variable_test_block');
          block.inputList[0].fieldRow[0].setValue('1');
          Blockly.Events.enable();

          var resultFieldDom = Blockly.Xml.blockToDom(block).childNodes[0];
          // Expect type is null and ID is '1' since we don't specify type and ID.
          assertVariableDomField(resultFieldDom, 'VAR', null, '1', 'name1');
        });
      });
    });
    suite('Comments', function() {
      suite('Headless', function() {
        setup(function() {
          this.block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block"/>'
          ), this.workspace);
        });
        test('Text', function() {
          this.block.setCommentText('test text');
          var xml = Blockly.Xml.blockToDom(this.block);
          var commentXml = xml.firstChild;
          chai.assert.equal(commentXml.tagName, 'comment');
          chai.assert.equal(commentXml.innerHTML, 'test text');
        });
        test('No Text', function() {
          var xml = Blockly.Xml.blockToDom(this.block);
          chai.assert.isNull(xml.firstChild);
        });
        test('Empty Text', function() {
          this.block.setCommentText('');
          var xml = Blockly.Xml.blockToDom(this.block);
          chai.assert.isNull(xml.firstChild);
        });
      });
      suite('Rendered', function() {
        setup(function() {
          // Let the parent teardown dispose of it.
          this.workspace = Blockly.inject('blocklyDiv', {comments: true});
          this.block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block"/>'
          ), this.workspace);
        });
        test('Text', function() {
          this.block.setCommentText('test text');
          var xml = Blockly.Xml.blockToDom(this.block);
          var commentXml = xml.firstChild;
          chai.assert.equal(commentXml.tagName, 'comment');
          chai.assert.equal(commentXml.innerHTML, 'test text');
        });
        test('No Text', function() {
          var xml = Blockly.Xml.blockToDom(this.block);
          chai.assert.isNull(xml.firstChild);
        });
        test('Empty Text', function() {
          this.block.setCommentText('');
          var xml = Blockly.Xml.blockToDom(this.block);
          chai.assert.isNull(xml.firstChild);
        });
        test('Size', function() {
          this.block.setCommentText('test text');
          this.block.getCommentIcon().setBubbleSize(100, 200);
          var xml = Blockly.Xml.blockToDom(this.block);
          var commentXml = xml.firstChild;
          chai.assert.equal(commentXml.tagName, 'comment');
          chai.assert.equal(commentXml.getAttribute('w'), 100);
          chai.assert.equal(commentXml.getAttribute('h'), 200);
        });
        test('Pinned True', function() {
          this.block.setCommentText('test text');
          this.block.getCommentIcon().setVisible(true);
          var xml = Blockly.Xml.blockToDom(this.block);
          var commentXml = xml.firstChild;
          chai.assert.equal(commentXml.tagName, 'comment');
          chai.assert.equal(commentXml.getAttribute('pinned'), 'true');
        });
        test('Pinned False', function() {
          this.block.setCommentText('test text');
          var xml = Blockly.Xml.blockToDom(this.block);
          var commentXml = xml.firstChild;
          chai.assert.equal(commentXml.tagName, 'comment');
          chai.assert.equal(commentXml.getAttribute('pinned'), 'false');
        });
      });
    });
  });
  suite('variablesToDom', function() {
    setup(function() {
      this.workspace = new Blockly.Workspace();
      Blockly.defineBlocksWithJsonArray([{
        'type': 'field_variable_test_block',
        'message0': '%1',
        'args0': [
          {
            'type': 'field_variable',
            'name': 'VAR',
            'variable': 'item'
          }
        ]
      }]);
      this.blockTypes_.push('field_variable_test_block');
    });
    teardown(function() {
      this.workspace.dispose();
    });
    test('One Variable', function() {
      sinon.stub(Blockly.utils, 'genUid').returns('1');
      this.workspace.createVariable('name1');
      var resultDom =
          Blockly.Xml.variablesToDom(this.workspace.getAllVariables());
      chai.assert.equal(resultDom.children.length, 1);
      var resultVariableDom = resultDom.children[0];
      chai.assert.equal(resultVariableDom.textContent, 'name1');
      chai.assert.isNull(resultVariableDom.getAttribute('type'));
      chai.assert.equal(resultVariableDom.getAttribute('id'), '1');
    });
    test('Two Variable one block', function() {
      this.workspace.createVariable('name1', '', 'id1');
      this.workspace.createVariable('name2', 'type2', 'id2');
      // If events are enabled during block construction, it will create a
      // default variable.
      Blockly.Events.disable();
      var block = new Blockly.Block(this.workspace, 'field_variable_test_block');
      block.inputList[0].fieldRow[0].setValue('id1');
      Blockly.Events.enable();

      var resultDom = Blockly.Xml.variablesToDom(this.workspace.getAllVariables());
      chai.assert.equal(resultDom.children.length, 2);
      assertVariableDom(resultDom.children[0], null, 'id1',
          'name1');
      assertVariableDom(resultDom.children[1], 'type2', 'id2',
          'name2');
    });
    test('No variables', function() {
      var resultDom =
          Blockly.Xml.variablesToDom(this.workspace.getAllVariables());
      chai.assert.equal(resultDom.children.length, 0);
    });
  });
  suite('domToText', function() {
    test('Round tripping', function() {
      var dom = Blockly.Xml.textToDom(this.complexXmlText);
      var text = Blockly.Xml.domToText(dom);
      chai.assert.equal(text.replace(/\s+/g, ''),
          this.complexXmlText.replace(/\s+/g, ''), 'Round trip');
    });
  });
  suite('domToPrettyText', function() {
    test('Round tripping', function() {
      var dom = Blockly.Xml.textToDom(this.complexXmlText);
      var text = Blockly.Xml.domToPrettyText(dom);
      chai.assert.equal(text.replace(/\s+/g, ''),
          this.complexXmlText.replace(/\s+/g, ''), 'Round trip');
    });
  });
  suite('domToBlock', function() {
    setup(function() {
      this.workspace = new Blockly.Workspace();
      Blockly.defineBlocksWithJsonArray([{
        "type": "variables_get",
        "message0": "%1",
        "args0": [
          {
            "type": "field_variable",
            "name": "VAR"
          }
        ]
      },
      {
        "type": "variables_set",
        "message0": "%1 %2",
        "args0": [
          {
            "type": "field_variable",
            "name": "VAR"
          },
          {
            "type": "input_value",
            "name": "VALUE"
          }
        ]
      },
      {
        "type": "math_change",
        "message0": "%1 %2",
        "args0": [
          {
            "type": "field_variable",
            "name": "VAR"
          },
          {
            "type": "input_value",
            "name": "DELTA",
            "check": "Number"
          }
        ]
      },
      {
        "type": "math_number",
        "message0": "%1",
        "args0": [{
          "type": "field_number",
          "name": "NUM",
          "value": 0
        }],
        "output": "Number"
      }]);
      Array.prototype.push.apply(
          this.blockTypes_,
          ['variables_get', 'variables_set', 'math_change', 'math_number']);
    });
    teardown(function() {
      this.workspace.dispose();
    });
    suite('Dynamic Category Blocks', function() {
      test('Untyped Variables', function() {
        this.workspace.createVariable('name1', '', 'id1');
        var blocksArray =
            Blockly.Variables.flyoutCategoryBlocks(this.workspace);
        for (var i = 0, xml; (xml = blocksArray[i]); i++) {
          Blockly.Xml.domToBlock(xml, this.workspace);
        }
      });
      test('Typed Variables', function() {
        this.workspace.createVariable('name1', 'String', 'id1');
        this.workspace.createVariable('name2', 'Number', 'id2');
        this.workspace.createVariable('name3', 'Colour', 'id3');
        var blocksArray =
            Blockly.VariablesDynamic.flyoutCategoryBlocks(this.workspace);
        for (var i = 0, xml; (xml = blocksArray[i]); i++) {
          Blockly.Xml.domToBlock(xml, this.workspace);
        }
      });
    });
    suite('Comments', function() {
      suite('Headless', function() {
        test('Text', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment>test text</comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.equal(block.getCommentText(), 'test text');
        });
        test('No Text', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment></comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.equal(block.getCommentText(), '');
        });
        test('Size', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment w="100" h="200">test text</comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.deepEqual(block.commentModel.size,
              {width: 100, height: 200});
        });
        test('Pinned True', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment pinned="true">test text</comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.isTrue(block.commentModel.pinned);
        });
        test('Pinned False', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment pinned="false">test text</comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.isFalse(block.commentModel.pinned);
        });
        test('Pinned Undefined', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment>test text</comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.isFalse(block.commentModel.pinned);
        });
      });
      suite('Rendered', function() {
        setup(function() {
          // Let the parent teardown dispose of it.
          this.workspace = Blockly.inject('blocklyDiv', {comments: true});
        });
        test('Text', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment>test text</comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.equal(block.getCommentText(), 'test text');
          chai.assert.isNotNull(block.getCommentIcon());
        });
        test('No Text', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment></comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.equal(block.getCommentText(), '');
          chai.assert.isNotNull(block.getCommentIcon());
        });
        test('Size', function() {
          var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
              '<block type="empty_block">' +
              '  <comment w="100" h="200">test text</comment>' +
              '</block>'
          ), this.workspace);
          chai.assert.deepEqual(block.commentModel.size,
              {width: 100, height: 200});
          chai.assert.isNotNull(block.getCommentIcon());
          chai.assert.deepEqual(block.getCommentIcon().getBubbleSize(),
              {width: 100, height: 200});
        });
        suite('Pinned', function() {
          setup(function() {
            this.clock = sinon.useFakeTimers();
          });
          test('Pinned True', function() {
            var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
                '<block type="empty_block">' +
                '  <comment pinned="true">test text</comment>' +
                '</block>'
            ), this.workspace);
            this.clock.tick(1);
            chai.assert.isTrue(block.commentModel.pinned);
            chai.assert.isNotNull(block.getCommentIcon());
            chai.assert.isTrue(block.getCommentIcon().isVisible());
          });
          test('Pinned False', function() {
            var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
                '<block type="empty_block">' +
                '  <comment pinned="false">test text</comment>' +
                '</block>'
            ), this.workspace);
            this.clock.tick(1);
            chai.assert.isFalse(block.commentModel.pinned);
            chai.assert.isNotNull(block.getCommentIcon());
            chai.assert.isFalse(block.getCommentIcon().isVisible());
          });
          test('Pinned Undefined', function() {
            var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
                '<block type="empty_block">' +
                '  <comment>test text</comment>' +
                '</block>'
            ), this.workspace);
            this.clock.tick(1);
            chai.assert.isFalse(block.commentModel.pinned);
            chai.assert.isNotNull(block.getCommentIcon());
            chai.assert.isFalse(block.getCommentIcon().isVisible());
          });
        });
      });
    });
  });
  suite('domToWorkspace', function() {
    setup(function() {
      this.workspace = new Blockly.Workspace();
      Blockly.defineBlocksWithJsonArray([{
        'type': 'field_variable_test_block',
        'message0': '%1',
        'args0': [
          {
            'type': 'field_variable',
            'name': 'VAR',
            'variable': 'item'
          }
        ]
      }]);
      this.blockTypes_.push('field_variable_test_block');
    });
    teardown(function() {
      this.workspace.dispose();
    });
    test('Backwards compatibility', function() {
      sinon.stub(Blockly.utils, 'genUid').returns('1');
      var dom = Blockly.Xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '  <block type="field_variable_test_block" id="block_id">' +
          '    <field name="VAR">name1</field>' +
          '  </block>' +
          '</xml>');
      Blockly.Xml.domToWorkspace(dom, this.workspace);
      chai.assert.equal(this.workspace.getAllBlocks(false).length, 1, 'Block count');
      assertVariableValues(this.workspace, 'name1', '', '1');
    });
    test('Variables at top', function() {
      var dom = Blockly.Xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '  <variables>' +
          '    <variable type="type1" id="id1">name1</variable>' +
          '    <variable type="type2" id="id2">name2</variable>' +
          '    <variable id="id3">name3</variable>' +
          '  </variables>' +
          '  <block type="field_variable_test_block">' +
          '    <field name="VAR" id="id3">name3</field>' +
          '  </block>' +
          '</xml>');
      Blockly.Xml.domToWorkspace(dom, this.workspace);
      chai.assert.equal(this.workspace.getAllBlocks(false).length, 1, 'Block count');
      assertVariableValues(this.workspace, 'name1', 'type1', 'id1');
      assertVariableValues(this.workspace, 'name2', 'type2', 'id2');
      assertVariableValues(this.workspace, 'name3', '', 'id3');
    });
    test('Variables at top duplicated variables tag', function() {
      var dom = Blockly.Xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '  <variables>' +
          '  </variables>' +
          '  <variables>' +
          '  </variables>' +
          '</xml>');
      chai.assert.throws(function() {
        Blockly.Xml.domToWorkspace(dom, this.workspace);
      });
    });
    test('Variables at top missing type', function() {
      var dom = Blockly.Xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '  <variables>' +
          '    <variable id="id1">name1</variable>' +
          '  </variables>' +
          '  <block type="field_variable_test_block">' +
          '    <field name="VAR" id="id1">name3</field>' +
          '  </block>' +
          '</xml>');
      chai.assert.throws(function() {
        Blockly.Xml.domToWorkspace(dom, this.workspace);
      });
    });
    test('Variables at top mismatch block type', function() {
      var dom = Blockly.Xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '  <variables>' +
          '    <variable type="type1" id="id1">name1</variable>' +
          '  </variables>' +
          '  <block type="field_variable_test_block">' +
          '    <field name="VAR" id="id1">name1</field>' +
          '  </block>' +
          '</xml>');
      chai.assert.throws(function() {
        Blockly.Xml.domToWorkspace(dom, this.workspace);
      });
    });
  });
  suite('appendDomToWorkspace', function() {
    setup(function() {
      Blockly.Blocks.test_block = {
        init: function() {
          this.jsonInit({
            message0: 'test',
          });
        }
      };
      this.workspace = new Blockly.Workspace();
    });
    teardown(function() {
      delete Blockly.Blocks.test_block;
      this.workspace.dispose();
    });
    test('Headless', function() {
      var dom = Blockly.Xml.textToDom(
          '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '  <block type="test_block" inline="true" x="21" y="23">' +
          '  </block>' +
          '</xml>');
      Blockly.Xml.appendDomToWorkspace(dom, this.workspace);
      chai.assert.equal(this.workspace.getAllBlocks(false).length, 1, 'Block count');
      var newBlockIds = Blockly.Xml.appendDomToWorkspace(dom, this.workspace);
      chai.assert.equal(this.workspace.getAllBlocks(false).length, 2, 'Block count');
      chai.assert.equal(newBlockIds.length, 1, 'Number of new block ids');
    });
  });
  suite('workspaceToDom -> domToWorkspace -> workspaceToDom', function() {
    setup(function() {
      var options = {
        comments: true
      };
      this.renderedWorkspace = Blockly.inject('blocklyDiv', options);
      this.headlessWorkspace =
          new Blockly.Workspace(new Blockly.Options(options));
    });
    teardown(function() {
      this.renderedWorkspace.dispose();
      this.headlessWorkspace.dispose();
    });
    var assertRoundTrip = function(originWs, targetWs) {
      var originXml = Blockly.Xml.workspaceToDom(originWs);
      Blockly.Xml.domToWorkspace(originXml, targetWs);
      var targetXml = Blockly.Xml.workspaceToDom(targetWs);

      var expectedXmlText = Blockly.Xml.domToText(originXml);
      var actualXmlText = Blockly.Xml.domToText(targetXml);

      chai.assert.equal(actualXmlText, expectedXmlText);
    };
    suite('Rendered -> XML -> Headless -> XML', function() {
      test('Comment', function() {
        var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
            '<block type="empty_block"/>'
        ), this.renderedWorkspace);
        block.setCommentText('test text');
        block.getCommentIcon().setBubbleSize(100, 100);
        block.getCommentIcon().setVisible(true);
        assertRoundTrip(this.renderedWorkspace, this.headlessWorkspace);
      });
    });
    suite('Headless -> XML -> Rendered -> XML', function() {
      test('Comment', function(done) {
        var block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
            '<block type="empty_block"/>'
        ), this.headlessWorkspace);
        block.setCommentText('test text');
        block.commentModel.size = new Blockly.utils.Size(100, 100);
        block.commentModel.pinned = true;
        
        assertRoundTrip(this.headlessWorkspace, this.renderedWorkspace);

        // domToBlockHeadless_ triggers setTimeout call we need to wait for.
        setTimeout(function() {
          done();
        }, 10);
      });
    });
  });
  suite('generateVariableFieldDom', function() {
    test('Case Sensitive', function() {
      var varId = 'testId';
      var type = 'testType';
      var name = 'testName';

      var mockVariableModel = {
        type: type,
        name: name,
        getId: function() {
          return varId;
        }
      };

      var generatedXml = Blockly.Xml.domToText(
          Blockly.Variables.generateVariableFieldDom(mockVariableModel));
      var expectedXml =
          '<field xmlns="https://developers.google.com/blockly/xml"' +
          ' name="VAR"' +
          ' id="' + varId + '"' +
          ' variabletype="' + type + '"' +
          '>' + name + '</field>';
      chai.assert.equal(generatedXml, expectedXml);
    });
  });
});
