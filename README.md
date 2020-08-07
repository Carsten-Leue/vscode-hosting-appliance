# hosting-appliance

Development tooling for the hosting appliance. The extension allows to easily copy files open in an editor to an LPAR to the correct location and to execute unit tests from within the IDE on the LPAR.

## System Setup

* Make sure to setup ssh access to your LPAR and enable passwordless authentication
* Have `ssh` and `scp` available on the claspath

## Usage

### Configuration

Configure the LPAR to work with in your vscode settings, either on the workspace or the user level

* `ha.lpar`: the hostname of the LPAR or the name of the ssh config 

### Copy a local file to the LPAR

Open the local file in your editor and run the `HA: local -> LPAR` command. The command will first try to identify the correct target location of the file based on its local name. The candidates are presented in a dropdown list, select the correct one from that list. The result of the selection is persisted. 

The command will then copy the local file to the LPAR using `scp`. 

### Reset a file mapping

Use the `HA: Reset filename mapping` command to clear any invalid selection made in the copy step before. The command will only reset the mapping for the currently opened file.

### Execute a single unit test on the LPAR

Open the unit test in your editor and run the `HA: Run Single Unit Test` command. This wil first update the file on the LPAR with the local copy and then runs the file as a unit test. The result is displayed in the output panel.

## Dependency Injection

The extension allows to easily scan your project for [injection tokens](https://pages.github.ibm.com/ZaaS/hpha-di/hpha_di.api.html#hpha_di.api.Injectable) and [providers](https://pages.github.ibm.com/ZaaS/hpha-di/hpha_di.api.html#hpha_di.api.ProviderDefinition). 

### Prerequisites

* Installation of the [Python Extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
* Installation of the [Import Magic Extension](https://marketplace.visualstudio.com/items?itemName=brainfit.vscode-importmagic)
* Configuration of the python path in your settings

### Injectables

Use the command `HA-DI: Injectables` to scan your virtual environment for injection tokens. You can search the tokens by name, package and type of injected interface. 

Selecting an injectable will import it into your python file.

### Providers

Use the command `HA-DI: Providers` to scan your virtual environment for providers for a particular injectable. You will first select an injectable. Then you'll see a list of providers that expose that selectable.

Selecting a provider will import it into your python file.

