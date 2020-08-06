from argparse import ArgumentParser
from importlib import import_module
from json import dump
from pkgutil import ModuleInfo, walk_packages
from re import compile
from sys import stdout
from types import ModuleType
from typing import Any, Iterable, List, Match, Optional, Pattern, Set, Tuple, Type

from hpha_di.api import Injectable, ProviderDefinition

CLASS_MATCHER: Pattern = compile("<class\\s+'([^\\']+)\\'>")

SEP = "\t"


def _extract_type(type_value: Type) -> str:
    type_str = str(type_value)
    match: Optional[Match] = CLASS_MATCHER.match(type_str)
    if match:
        return match.group(1)
    return type_str


def _print_injectable(inj: Injectable, name: str, module: str):
    # extract some info
    key = id(inj)
    type_str = _extract_type(inj.context_type)
    print('injectable', key, name, module, type_str, sep=SEP)


def _print_provider_definition(provider: ProviderDefinition, name: str, module: str):
    key = id(provider)
    key_inj = id(provider.injectable)
    deps = set(id(inj) for inj_name, inj in provider.dependencies)
    deps.discard(key_inj)

    print('definition', key, name, module, 'export',
          key_inj, 'import', *deps, sep=SEP)


def _print_module(mod: Iterable[ProviderDefinition], name: str, module: str):
    key = id(mod)

    inj_exp: Set[Injectable] = set()
    inj_imp: Set[Injectable] = set()

    cpy = tuple(mod)

    for provider in cpy:
        inj_exp.add(provider.injectable)
        for dep_name, dep in provider.dependencies:
            inj_imp.add(dep)

    keys_exp = set(id(inj) for inj in inj_exp)
    keys_imp = set(id(inj) for inj in inj_imp)

    keys_imp.difference_update(keys_exp)

    print('module', key, name, module, 'export',
          *keys_exp, 'import', *keys_imp, sep=SEP)


def _is_public_module(info: ModuleInfo):
    return info is not None and info.ispkg and not info.name.startswith('_') and not '._' in info.name and 'hpha' in info.name


def _is_public_name(name: str) -> bool:
    return name is not None and not name.startswith('_')


def _get_public_symbols(module: ModuleType) -> Iterable[Tuple[str, Any]]:
    return ((symbol, getattr(module, symbol)) for symbol in dir(module) if _is_public_name(symbol))


def _is_injectable(value: Any) -> bool:
    return isinstance(value, Injectable)


def _is_provider_definition(value: Any) -> bool:
    return isinstance(value, ProviderDefinition)


def _is_iterable(obj):
    return hasattr(type(obj), '__iter__')


def _is_module(value: Any) -> bool:
    return _is_iterable(value) and all(_is_provider_definition(item) for item in value)


def _is_module_or_provider_definition(value: Any) -> bool:
    return _is_provider_definition(value) or _is_module(value)


def _list_providers_in_module(module: ModuleType) -> Iterable[Tuple[str, ProviderDefinition]]:
    #: list the public symbols
    return ((name, inj) for name, inj in _get_public_symbols(module) if _is_module_or_provider_definition(inj))


def _implements_injectable(inj: Injectable, provider: ProviderDefinition) -> bool:
    return provider.injectable is inj


def analyze_appliance():
    #: list all modules
    modules = (module for module in walk_packages()
               if _is_public_module(module))

    #: list of known injectables
    injectable_set: Set[Injectable] = set()

    definition_set: Set[ProviderDefinition] = set()

    module_set: Set[Iterable[ProviderDefinition]] = set()

    def print_injectable(inj: Injectable, name: str, module: str):
        if not inj in injectable_set:
            injectable_set.add(inj)
            _print_injectable(inj, name, module)

    def print_provider_definition(provider: ProviderDefinition, name: str, module: str):
        if not provider in definition_set:
            definition_set.add(provider)
            _print_provider_definition(provider, name, module)

    def print_module(mod: Iterable[ProviderDefinition], name: str, module: str):
        if not mod in module_set:
            module_set.add(mod)
            _print_module(mod, name, module)

    for info in modules:
        module_name = info.name

        for name, pub_symbol in _get_public_symbols(import_module(info.name)):
            #: check if injectable
            if _is_injectable(pub_symbol):
                print_injectable(pub_symbol, name, module_name)
            elif _is_provider_definition(pub_symbol):
                print_provider_definition(pub_symbol, name, module_name)
            elif _is_module(pub_symbol):
                print_module(pub_symbol, name, module_name)


if __name__ == "__main__":
   analyze_appliance()
