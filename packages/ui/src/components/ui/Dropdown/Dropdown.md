# Dropdown

This component standarizes and provides an accesible API for rendering a `Dropdown` in the UI.

## Components

The `Dropdown` is a compound component composed by a `DropdownButton` and a `DropdownMenu`.
Every Dropdown usage should render the `Dropdown.Button` and `Dropdown.Menu` children to specify the button and the menu, correspondly. Also, the `Dropdown.Menu` should render `Dropdown.MenuItem` for each item.

If the `Dropdown.Button` is not provided the `DropdownIconButton` is used rendering the `IconNames.THREE_DOTS_ICON`

### Built-in buttons

There are 2 built-in implementations for the DropdownButton:

-   `DropdownIconButton` an IconButton that renders the `IconNames.THREE_DOTS_ICON` by default.
-   `DropdownOutlinedIconButton` an Outlined button that renders an Icon in the middle of it.

## Usage

```react
const MyComponent = () => {
    const [selected,setSelected] = React.useState(null)
    return (
        <Dropdown onClickItem={setSelected}>
            <Dropdown.Button>

            </Dropdown.Button>
            <Dropdown.Menu>
                <Dropdown.MenuItem selected={selected === "1"} value="1">Item 1</Dropdown.MenuItem>
                <Dropdown.MenuItem selected={selected === "2"} value="2">Item 2</Dropdown.MenuItem>
                <Dropdown.MenuItem selected={selected === "3"} value="3">Item 3</Dropdown.MenuItem>
            </Dropdown.Menu>
        </Dropdown>
    )
}
```

##
