from importlib import import_module
from json import dump
from pkgutil import ModuleInfo, walk_packages
from sys import stdout
from types import ModuleType
from typing import Any, Iterable, List, Tuple, Type

from hpha_di.api import Injectable


def _is_public_module(info: ModuleInfo):
    return info is not None and info.ispkg and not info.name.startswith('_') and not '._' in info.name and 'hpha' in info.name


def _is_public_name(name: str) -> bool:
    return name is not None and not name.startswith('_')


def _get_public_symbols(module: ModuleType) -> Iterable[Tuple[str, Any]]:
    return ((symbol, getattr(module, symbol)) for symbol in dir(module) if _is_public_name(symbol))


def _is_injectable(value: Any) -> bool:
    return isinstance(value, Injectable)


def _list_injectables_in_module(module: ModuleType) -> Iterable[Tuple[str, Injectable]]:
    #: list the public symbols
    return ((name, inj) for name, inj in _get_public_symbols(module) if _is_injectable(inj))


def _list_all_injectables() -> Iterable[Tuple[str, str, str]]:
    #: list all modules
    modules = (module for module in walk_packages()
               if _is_public_module(module))

    #: map of injectables
    result: List[Tuple[str, str, str]] = list()

    for info in modules:
        module_name = info.name
        for name, inj in _list_injectables_in_module(import_module(info.name)):
            result.append((name, module_name, str(inj.context_type)))

    return result


if __name__ == "__main__":
    dump(_list_all_injectables(), stdout)
