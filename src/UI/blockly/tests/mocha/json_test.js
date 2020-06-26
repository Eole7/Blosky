/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

suite('JSON Block Definitions', function() {
  setup(function() {
    this.workspace_ = new Blockly.Workspace();
    this.blocks_ = [];
    this.blockTypes_ = [];
    this.messages_ = [];
  });

  teardown(function() {
    for (var i = 0; i < this.blocks_.length; i++) {
      var block = this.blocks_[i];
      block.dispose();
    }
    for (var i = 0, blockType; (blockType = this.blockTypes_[i]); i++) {
      delete Blockly.Blocks[blockType];
    }
    for (var i = 0, message; (message = this.messages_[i]); i++) {
      delete Blockly.Msg[message];
    }
    this.workspace_.dispose();
  });

  suite('defineBlocksWithJsonArray', function() {
    test('Basic block', function() {
      /**  Ensure a block can be instantiated from a JSON definition.  */
      var BLOCK_TYPE = 'test_json_minimal';
      this.blockTypes_.push(BLOCK_TYPE);
      var workspace = this.workspace_;
      var block;
      var warnings = captureWarnings(function() {
        Blockly.defineBlocksWithJsonArray([{
          "type": BLOCK_TYPE
        }]);
        block = new Blockly.Block(workspace, BLOCK_TYPE);
      });
      this.blocks_.push(block);

      chai.assert.isNotNull(block);
      chai.assert.equal(BLOCK_TYPE, block.type);
      chai.assert.equal(warnings.length, 0,
          'Expecting no warnings when defining and creating a simple block.');
    });

    test('Null or undefined type id', function() {
      var BLOCK_TYPE1 = 'test_json_before_bad_blocks';
      var BLOCK_TYPE2 = 'test_json_after_bad_blocks';
      this.blockTypes_.push(BLOCK_TYPE1);
      this.blockTypes_.push(BLOCK_TYPE2);

      chai.assert.isUndefined(Blockly.Blocks[BLOCK_TYPE1]);
      chai.assert.isUndefined(Blockly.Blocks[BLOCK_TYPE2]);
      var blockTypeCount = Object.keys(Blockly.Blocks).length;

      var warnings = captureWarnings(function() {
        Blockly.defineBlocksWithJsonArray([
          {"type": BLOCK_TYPE1},
          {"type": undefined},
          {"type": null},
          {"type": BLOCK_TYPE2}]);
      });

      chai.assert.isNotNull(Blockly.Blocks[BLOCK_TYPE1],
          'Block before bad blocks should be defined.');
      chai.assert.isNotNull(Blockly.Blocks[BLOCK_TYPE2],
          'Block after bad blocks should be defined.');
      chai.assert.equal(Object.keys(Blockly.Blocks).length, blockTypeCount + 2);
      chai.assert.equal(warnings.length, 2,
          'Expecting 2 warnings, one for each bad block.');
    });

    test('Null item', function() {
      var BLOCK_TYPE1 = 'test_block_before_null';
      var BLOCK_TYPE2 = 'test_block_after_null';
      this.blockTypes_.push(BLOCK_TYPE1);
      this.blockTypes_.push(BLOCK_TYPE2);

      chai.assert.isUndefined(Blockly.Blocks[BLOCK_TYPE1]);
      chai.assert.isUndefined(Blockly.Blocks[BLOCK_TYPE2]);
      var blockTypeCount = Object.keys(Blockly.Blocks).length;

      var warnings = captureWarnings(function() {
        Blockly.defineBlocksWithJsonArray([
          {
            "type": BLOCK_TYPE1,
            "message0": 'before'
          },
          null,
          {
            "type": BLOCK_TYPE2,
            "message0": 'after'
          }]);
      });
      chai.assert.isNotNull(Blockly.Blocks[BLOCK_TYPE1],
          'Block before null in array should be defined.');
      chai.assert.isNotNull(Blockly.Blocks[BLOCK_TYPE2],
          'Block after null in array should be defined.');
      chai.assert.equal(Object.keys(Blockly.Blocks).length, blockTypeCount + 2);
      chai.assert.equal(warnings.length, 1, 'Expected 1 warning for the bad block.');
    });

    test('Undefined item', function() {
      var BLOCK_TYPE1 = 'test_block_before_undefined';
      var BLOCK_TYPE2 = 'test_block_after_undefined';
      this.blockTypes_.push(BLOCK_TYPE1);
      this.blockTypes_.push(BLOCK_TYPE2);

      chai.assert.isUndefined(Blockly.Blocks[BLOCK_TYPE1]);
      chai.assert.isUndefined(Blockly.Blocks[BLOCK_TYPE2]);
      var blockTypeCount = Object.keys(Blockly.Blocks).length;
      var warnings = captureWarnings(function() {
        Blockly.defineBlocksWithJsonArray([
          {
            "type": BLOCK_TYPE1,
            "message0": 'before'
          },
          undefined,
          {
            "type": BLOCK_TYPE2,
            "message0": 'after'
          }]);
      });
      chai.assert.isNotNull(Blockly.Blocks[BLOCK_TYPE1],
          'Block before undefined in array should be defined.');
      chai.assert.isNotNull(Blockly.Blocks[BLOCK_TYPE2],
          'Block after undefined in array should be defined.');
      chai.assert.equal(Object.keys(Blockly.Blocks).length, blockTypeCount + 2);
      chai.assert.equal( warnings.length, 1, 'Expected 1 warning for the bad block.');
    });

    test('message0 creates input', function() {
      var BLOCK_TYPE = 'test_json_message0';
      this.blockTypes_.push(BLOCK_TYPE);
      var MESSAGE0 = 'message0';
      Blockly.defineBlocksWithJsonArray([{
        "type": BLOCK_TYPE,
        "message0": MESSAGE0
      }]);

      var block = new Blockly.Block(this.workspace_, BLOCK_TYPE);
      chai.assert.equal(1, block.inputList.length);
      chai.assert.equal(1, block.inputList[0].fieldRow.length);
      var textField = block.inputList[0].fieldRow[0];
      chai.assert.equal(Blockly.FieldLabel, textField.constructor);
      chai.assert.equal(MESSAGE0, textField.getText());
    });

    test('message1 and message0 creates two inputs', function() {
      /**  Ensure message1 creates a new input.  */
      var BLOCK_TYPE = 'test_json_message1';
      this.blockTypes_.push(BLOCK_TYPE);
      var MESSAGE0 = 'message0';
      var MESSAGE1 = 'message1';
      Blockly.defineBlocksWithJsonArray([{
        "type": BLOCK_TYPE,
        "message0": MESSAGE0,
        "message1": MESSAGE1
      }]);

      var block = new Blockly.Block(this.workspace_, BLOCK_TYPE);
      this.blocks_.push(block);
      chai.assert.equal(2, block.inputList.length);

      chai.assert.equal(1, block.inputList[0].fieldRow.length);
      var textField = block.inputList[0].fieldRow[0];
      chai.assert.equal(Blockly.FieldLabel, textField.constructor);
      chai.assert.equal(MESSAGE0, textField.getText());

      chai.assert.equal(1, block.inputList[1].fieldRow.length);
      var textField = block.inputList[1].fieldRow[0];
      chai.assert.equal(Blockly.FieldLabel, textField.constructor);
      chai.assert.equal(MESSAGE1, textField.getText());
    });

    test('Message string is dereferenced', function() {
      var BLOCK_TYPE = 'test_json_message0_i18n';
      this.blockTypes_.push(BLOCK_TYPE);
      var MESSAGE0 = '%{BKY_MESSAGE}';
      var MESSAGE = 'message';

      Blockly.Msg['MESSAGE'] = MESSAGE;
      this.messages_.push('MESSAGE');
      Blockly.defineBlocksWithJsonArray([{
        "type": BLOCK_TYPE,
        "message0": MESSAGE0
      }]);

      var block = new Blockly.Block(this.workspace_, BLOCK_TYPE);
      this.blocks_.push(block);
      chai.assert.equal(1, block.inputList.length);
      chai.assert.equal(1, block.inputList[0].fieldRow.length);
      var textField = block.inputList[0].fieldRow[0];
      chai.assert.equal(Blockly.FieldLabel, textField.constructor);
      chai.assert.equal(MESSAGE, textField.getText());
    });

    test('Dropdown', function() {
      var BLOCK_TYPE = 'test_json_dropdown';
      this.blockTypes_.push(BLOCK_TYPE);
      var FIELD_NAME = 'FIELD_NAME';
      var LABEL0 = 'LABEL0';
      var VALUE0 = 'VALUE0';
      var LABEL1 = 'LABEL1';
      var VALUE1 = 'VALUE1';
      Blockly.defineBlocksWithJsonArray([{
        "type": BLOCK_TYPE,
        "message0": "%1",
        "args0": [
          {
            "type": "field_dropdown",
            "name": FIELD_NAME,
            "options": [
              [LABEL0, VALUE0],
              [LABEL1, VALUE1]
            ]
          }
        ]
      }]);

      var block = new Blockly.Block(this.workspace_, BLOCK_TYPE);
      this.blocks_.push(block);
      chai.assert.equal(1, block.inputList.length);
      chai.assert.equal(1, block.inputList[0].fieldRow.length);
      var dropdown = block.inputList[0].fieldRow[0];
      chai.assert.equal(dropdown, block.getField(FIELD_NAME));
      chai.assert.equal(Blockly.FieldDropdown, dropdown.constructor);
      chai.assert.equal(VALUE0, dropdown.getValue());

      var options = dropdown.getOptions();
      chai.assert.equal(LABEL0, options[0][0]);
      chai.assert.equal(VALUE0, options[0][1]);
      chai.assert.equal(LABEL1, options[1][0]);
      chai.assert.equal(VALUE1, options[1][1]);
    });


    test('Dropdown with images', function() {
      var BLOCK_TYPE = 'test_json_dropdown';
      this.blockTypes_.push(BLOCK_TYPE);
      var FIELD_NAME = 'FIELD_NAME';
      var IMAGE1_ALT_TEXT = 'Localized message.';
      Blockly.Msg['ALT_TEXT'] = IMAGE1_ALT_TEXT;
      this.messages_.push('ALT_TEXT');
      var IMAGE0 = {
        'width': 12,
        'height': 34,
        'src': 'http://image0.src',
        'alt': 'IMAGE0 alt text'
      };
      var VALUE0 = 'VALUE0';
      var IMAGE1 = {
        'width': 56,
        'height': 78,
        'src': 'http://image1.src',
        'alt': '%{BKY_ALT_TEXT}'
      };
      var VALUE1 = 'VALUE1';
      var IMAGE2 = {
        'width': 90,
        'height': 123,
        'src': 'http://image2.src'
      };
      var VALUE2 = 'VALUE2';

      Blockly.defineBlocksWithJsonArray([{
        "type": BLOCK_TYPE,
        "message0": "%1",
        "args0": [
          {
            "type": "field_dropdown",
            "name": FIELD_NAME,
            "options": [
              [IMAGE0, VALUE0],
              [IMAGE1, VALUE1],
              [IMAGE2, VALUE2]
            ]
          }
        ]
      }]);

      var block = new Blockly.Block(this.workspace_, BLOCK_TYPE);
      this.blocks_.push(block);
      chai.assert.equal(1, block.inputList.length);
      chai.assert.equal(1, block.inputList[0].fieldRow.length);
      var dropdown = block.inputList[0].fieldRow[0];
      chai.assert.equal(dropdown, block.getField(FIELD_NAME));
      chai.assert.equal(Blockly.FieldDropdown, dropdown.constructor);
      chai.assert.equal(VALUE0, dropdown.getValue());

      function assertImageEquals(actualImage, expectedImage) {
        chai.assert.equal(actualImage.width, expectedImage.width);
        chai.assert.equal(actualImage.height, expectedImage.height);
        chai.assert.equal(actualImage.src, expectedImage.src);
      }

      var options = dropdown.getOptions();
      var image0 = options[0][0];
      assertImageEquals(IMAGE0, image0);
      chai.assert.equal(IMAGE0.alt, image0.alt);
      chai.assert.equal(options[0][1], VALUE0);

      var image1 = options[1][0];
      assertImageEquals(IMAGE1, image1);
      chai.assert.equal(IMAGE1.alt, IMAGE1_ALT_TEXT);  // Via Msg reference
      chai.assert.equal(VALUE1, options[1][1]);

      var image2 = options[2][0];
      assertImageEquals(IMAGE1, image1);
      chai.assert.notExists(image2.alt);  // No alt specified.
      chai.assert.equal(VALUE2, options[2][1]);
    });
  });
});
