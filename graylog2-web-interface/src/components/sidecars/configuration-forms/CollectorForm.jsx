import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Reflux from 'reflux';
import lodash from 'lodash';
import { Button, ButtonToolbar, Col, ControlLabel, FormGroup, HelpBlock, Row } from 'react-bootstrap';

import { Select, SourceCodeEditor } from 'components/common';
import { Input } from 'components/bootstrap';
import history from 'util/History';
import Routes from 'routing/Routes';

import CombinedProvider from 'injection/CombinedProvider';

const { CollectorsStore, CollectorsActions } = CombinedProvider.get('Collectors');
const { CollectorConfigurationsActions } = CombinedProvider.get('CollectorConfigurations');

const CollectorForm = createReactClass({
  displayName: 'CollectorForm',

  propTypes: {
    action: PropTypes.oneOf(['create', 'edit']),
    collector: PropTypes.object,
  },

  mixins: [Reflux.connect(CollectorsStore)],

  getDefaultProps() {
    return {
      action: 'edit',
      collector: {
        default_template: '',
      },
    };
  },

  getInitialState() {
    return {
      error: false,
      validation_errors: {},
      formData: {
        id: this.props.collector.id,
        name: this.props.collector.name,
        service_type: this.props.collector.service_type,
        node_operating_system: this.props.collector.node_operating_system,
        executable_path: this.props.collector.executable_path,
        execute_parameters: this.props.collector.execute_parameters,
        validation_parameters: this.props.collector.validation_parameters,
        default_template: String(this.props.collector.default_template),
      },
    };
  },

  componentDidMount() {
    CollectorsActions.all();
    CollectorConfigurationsActions.all();
  },

  hasErrors() {
    return this.state.error;
  },

  _save() {
    if (!this.hasErrors()) {
      if (this.props.action === 'create') {
        CollectorsActions.create(this.state.formData)
          .then(() => history.push(Routes.SYSTEM.SIDECARS.CONFIGURATION));
      } else {
        CollectorsActions.update(this.state.formData);
      }
    }
  },

  _formDataUpdate(key) {
    return (nextValue) => {
      const nextFormData = lodash.cloneDeep(this.state.formData);
      nextFormData[key] = nextValue;
      this._validateFormData(nextFormData);
      this.setState({ formData: nextFormData });
    };
  },

  _validateFormData(nextFormData) {
    if (
      nextFormData.name &&
      nextFormData.node_operating_system) {
      CollectorsActions.validate(nextFormData).then(validation => (
        this.setState({ validation_errors: validation.errors, error: validation.failed })
      ));
    }
  },

  _onNameChange(event) {
    const nextName = event.target.value;
    this._formDataUpdate('name')(nextName);
  },

  _onInputChange(key) {
    return (event) => {
      this._formDataUpdate(key)(event.target.value);
    };
  },

  _onSubmit(event) {
    event.preventDefault();
    this._save();
  },

  _onCancel() {
    history.goBack();
  },

  _formatServiceTypes() {
    const options = [];
    options.push({ value: 'exec', label: 'Foreground execution' });
    options.push({ value: 'svc', label: 'Windows service' });

    return options;
  },

  _formatOperatingSystems() {
    const options = [];
    options.push({ value: 'linux', label: 'Linux' });
    options.push({ value: 'windows', label: 'Windows' });

    return options;
  },

  _formatValidationMessage(fieldName, defaultText) {
    if (this.state.validation_errors[fieldName]) {
      return (<div>
        <span><b>{this.state.validation_errors[fieldName][0]}</b></span>
      </div>);
    }
    return <span>{defaultText}</span>;
  },

  _validationState(fieldName) {
    if (this.state.validation_errors[fieldName]) {
      return 'error';
    }
    return null;
  },

  render() {
    let validationParameters = '';
    let executeParameters = '';
    if (this.state.formData.validation_parameters) {
      validationParameters = this.state.formData.validation_parameters;
    }
    if (this.state.formData.execute_parameters) {
      executeParameters = this.state.formData.execute_parameters;
    }
    return (
      <div>
        <form onSubmit={this._onSubmit}>
          <fieldset>
            <Input type="text"
                   id="name"
                   label="Name"
                   onChange={this._onNameChange}
                   bsStyle={this._validationState('name')}
                   help={this._formatValidationMessage('name', 'Name for this collector')}
                   value={this.state.formData.name}
                   autoFocus
                   required />

            <FormGroup controlId="service_type">
              <ControlLabel>Process management</ControlLabel>
              <Select inputProps={{ id: 'service_type' }}
                      options={this._formatServiceTypes()}
                      value={this.state.formData.service_type}
                      onChange={this._formDataUpdate('service_type')}
                      placeholder="Service Type"
                      required />
              <HelpBlock>Choose the service type this collector is meant for.</HelpBlock>
            </FormGroup>

            <FormGroup controlId="operating_system">
              <ControlLabel>Operating System</ControlLabel>
              <Select inputProps={{ id: 'node_operating_system' }}
                      options={this._formatOperatingSystems()}
                      value={this.state.formData.node_operating_system}
                      onChange={this._formDataUpdate('node_operating_system')}
                      placeholder="Name"
                      required />
              <HelpBlock>Choose the operating system this collector is meant for.</HelpBlock>
            </FormGroup>

            <Input type="text"
                   id="executablePath"
                   label="Executable Path"
                   onChange={this._onInputChange('executable_path')}
                   bsStyle={this._validationState('executable_path')}
                   help={this._formatValidationMessage('executable_path', 'Path to the collector executable')}
                   value={this.state.formData.executable_path}
                   required />

            <Input type="text"
                   id="executeParameters"
                   label="Execute Parameters"
                   onChange={this._onInputChange('execute_parameters')}
                   help={<span>Parameters the collector is started with.<strong> %s will be replaced by the path to the configuration file.</strong></span>}
                   value={executeParameters} />

            <Input type="text"
                   id="validationParameters"
                   label="Parameters for Configuration Validation"
                   onChange={this._onInputChange('validation_parameters')}
                   help={<span>Parameters that validate the configuration file. <strong> %s will be replaced by the path to the configuration file.</strong></span>}
                   value={validationParameters} />

            <FormGroup controlId="defaultTemplate">
              <ControlLabel>Default Template</ControlLabel>
              <SourceCodeEditor id="template"
                                value={this.state.formData.default_template}
                                onChange={this._formDataUpdate('default_template')} />
              <HelpBlock>The default Collector configuration.</HelpBlock>
            </FormGroup>
          </fieldset>

          <Row>
            <Col md={12}>
              <FormGroup>
                <ButtonToolbar>
                  <Button type="submit" bsStyle="primary" disabled={this.hasErrors()}>
                    {this.props.action === 'create' ? 'Create' : 'Update'}
                  </Button>
                  <Button type="button" onClick={this._onCancel}>
                    {this.props.action === 'create' ? 'Cancel' : 'Back'}
                  </Button>
                </ButtonToolbar>
              </FormGroup>
            </Col>
          </Row>
        </form>
      </div>
    );
  },
});

export default CollectorForm;
