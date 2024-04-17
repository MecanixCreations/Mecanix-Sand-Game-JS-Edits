const BrushDefs = window.SandGameJS.BrushDefs;
    const Brushes = window.SandGameJS.Brushes;
    const ToolDefs = window.SandGameJS.ToolDefs;
    const Tools = window.SandGameJS.Tools;
    const TemplateDefs = window.SandGameJS.TemplateDefs;
    const Resources = window.SandGameJS.Resources;
    const Scenes = window.SandGameJS.Scenes;
    
    //Brushes.colorRandomize adds a noise effect to the brush, Brushes.color will use ONE color for the brush
    const mySandBrush = Brushes.colorRandomize(3, Brushes.colorPaletteRandom("100,200,0\n100,200,0\n100,200,0\n100,200,0\n100,200,0\n100,200,0\n100,200,0\n100,200,0\n100,200,0\n75,175,0\n", BrushDefs.WATER));
    const mySandTool = Tools.roundBrushTool(mySandBrush, ToolDefs.DEFAULT_SIZE, ToolDefs.WATER.getInfo().derive({
      displayName: 'Uranium Waste',
        badgeStyle: {
            backgroundColor: 'rgb(100,200,0)',
        }
    }));

    const myTextureBrush = Brushes.colorRandomize(12, Brushes.colorTexture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAB6RJREFUWEe112tsk9cdx/HvE8f243tsJ7ETx45jkhBCaAMlsAWSFugAwbZWG1o3IVG2SX2zaaqmqlOrai3SNJVu2jo6itrRqRubJgQtnRAw1tFSrh33a4CE3J2rb4ntOL6fKZ7IICUQNvbyvHvO73+e3/kcSV9UJjRWPYFWL5JIAxJ5Kj2z5jaiVct4vd2MBG+iLaqhvNRBNjWGf9hL2OdHoVJQWOhAq1diKbThMmS4cqOVLQ01ZDq81NQqGLRWUfxkLeF9n7HxSJS4QoPF7uLmlbMUuiqRfvTuW6Jz6Caf//Uk/rOtGArMqLRGwqEQepMJpUKLEHEsRWXojDLtN67jcFbQ39XKshVNyBo95S4HO3fsIRCJoMnGqFTp0UVjLDKomVPvwWENc/JEKz8bEugKyhgfD6PIUxAbG0Wa9dw3hSaTR+eBy5hkJ5lkiPovLWYsHKe7rYVB7zWEkCh11lFe60LW6ZAVeVy7dIOhvj7qFzcSGYnS3nYTq9WMXpvBYrPT29FKIhjFrs+jKJ0hG4tyUqlkatpS4erHRaLXT9aXwl27ipivnfT4KEFfALujgkQqzmjQTzzch9ZYjKnYSiqRwOmwEx4dpatjAENBEfExH2UVbspcNlSykq7OPoa7ujBoZXzBERQ2LRte/CFT05ZK1qwR8e5+xrq8951zd0cPIpvg4OGP+NrXn6PYYufGtSOYCufQ8Fgds2pn0dfbz+UL55F1BYwOdjMSDlG2eiHuxnI6rg8xNW3J7qkTwSEvYjyO55Gl6I2maef8zrY/sPnXr+DtH2bX7kOoJCUt5w9jNJfgcJVRUV1NOp3m7KnTkMkS8XWi1ilxNS0Au5HezkGmpi21HtkktvxyF+/t66GkrolIYJh0YpRCmwP/YIBFX15ARWUpijyJ3731Lha7h4amZVy5eJF0KsxwVwe28ipERuCqsOf+jP4eH7F4hGcfd+Ayy7R1DvPeqW6086qZmrbku7hJnPrjDr6/LUC2wEk8K8j4vbh1JnRmNyUNNezfuxuVrgCD0QzZJHPrF3Li0CcYbGWo8lX4u1tRyRl2bPDw+lUH/T099Pe04CkrI5GOo8yX6fcNYSi0MzVt6bffWyz2XYyStNdTVvMou7a/j6zVEosEScUCzH5sCemEgnJXMbHYOJFojO6OVlLjSZLJCGqtAZFKsXLZQjQ181Gbzex5cyvRUAdOo4GldUUcbx1n/TOL2bBuDlPTlr7T/KgwKWV2HG8nkSZ3yJRqC4IUmXiU8rpFkMxj2DeAwWQF8oiFA1gKC2hsWszxI0cJdHfw0tzZqJ3FDCtklhHiaCCfrP4mP993Vdr/m/ViwXwbCpOJqWlLl95eIj79+yibDoVQOAz3bESRTJFIxkgmoshaK1arHqPZRsgfINx7nbr8fBZp1DRZZPZaihCVHs63t3Lu5DHJ45wjfvwVI7enrcmOIP15nUf87bqW9KpvEy3w3bMRZU0+8XgSv7cFvdmDEBmSyQx2h4OQf4BYuB+lgEVKFQ1VThasWEifd5g9Qe20o5OMapu4Fd/vC6X7NmKeQkUmFcNqMvDkIyaMqiyRrI6jFwYIpvIpKa8gNDDM+MjQ5EH2Skw7Osld+YS4Fd95t2lGjSiJBK9/twKPVc2NAQV7Px8hQ5qzvQkMJjvj8fHJg2w0F3Ov0Unu6uXi9vjSsvK+jXj7zVfrsiBiI9ztIGsLjLnL7F6jk9avWCDuFl9N4/J733zBEWRNlh0/KcOujvPUVlPuDkkmE3e9zKYbnbS0qlpMF1/zyuWc/Meh3K+5ZNnKyUY8fc5L25XzxCI9vLy6nMr8CG/0N+SsEI1lv3CZ+XrbWPr0U1w8+hkvr+GO0U3bA80rmugbijDQdROFIoU+X8FAKEC9s5SRoI+BsQxZlYYPfurJJdD8hsQeZ4bnM65JtLzdbObIWIY9x9oorF9O/43r2Nx1XD31Meser8qN7o4eMOoNrHDq+cvVAEplhqzIJzEeAUkgCXlyF3kWB8G2Exg0Gp5fVpJLYNuxfyPkn4X23IfMREOXDh/4Tw980DWaK5jq2vlUVVdP9v+f1jin3cUP1tbxRGmMzR+P0DEUQ2Mx4ohmZ6yhiaaVNLpykaeA4lI3gz2dND6xlFeLUvc13ZnDn96hoXm2NGd6BrGojbkPmYmGJuwpvfDiS2Ldt9YyMORn47OvzMh05e6Ho6EJe0pNqzaKBzHdwQMfPjQNTdhTkrWVYqam+8Vrrz1UDU30hiQptGKmprv85tmHqqGJ3pBUKquYqekG9l+f1JBn4Ve/IOhih/GBNDTxxpDU6hLxv5jubi+l7s5zM9LQhD0ld+Mzoqh6Dt2nT+bKpaFpzQPv4m4vpR07D+as+OHmZqbTkMZZj+Rp2iBkh5NAew+hK4e4VS7f2Hpmxru4m6Df377zDisuCe29Q0NXTpzG29GONLuuWegNttwiHOzk1bWlJMZSbD+dIZyvZtTfck/TiSQPbMVfnWth7qJV9LRcQNIaqsStRcB3lepiA8FollKLCotGpj8axafT5qy4ZePcO3Zx+cTZ3Ov5v7HiJ+e7GO7tJIelirnLxcRC1qrIU+gY9fUyz21GNjgYIx/n07X/Fyu+sPsj6V/6uRnUH1FNQAAAAABJRU5ErkJgggAA", BrushDefs.COAL));
    const myTextureTool = Tools.roundBrushTool(myTextureBrush, ToolDefs.DEFAULT_SIZE, ToolDefs.COAL.getInfo().derive({
        displayName: 'Rubbish',
        badgeStyle: {
                    //backgroundColor is a Base64 value
            backgroundColor: '#171c37',
        }
    }));

    const MY_SAND_2_BRUSH = Brushes.colorPaletteRandom("229, 112, 24", BrushDefs.SAND);
    const MY_SAND_2_TOOL = Tools.roundBrushTool(MY_SAND_2_BRUSH, ToolDefs.DEFAULT_SIZE, ToolDefs.SAND.getInfo().derive({
        codeName: 'sand_2',
        displayName: 'Sand 2 (random palette)',
        badgeStyle: {
            backgroundColor: '229, 112, 24',
        }
    }));

    const MY_TEMPLATE = Tools.templateSelectionTool([
        {
            info: {
              displayName: "Pallet",
              category: "template",
              icon: {
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAMCAYAAABiDJ37AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAABuSURBVDhPY/wPBBc3ljDAgL5/DwMlfLCBu7udoVzKAYoLQbZhA+guwgZgapjAJBUB44UNxf+hbJLDCxufcVeXE9xASoFr6V4GFjE1QzAHZDo2gO4CbABZDdXDEG4gzBYQDcPYALo8uroRF4YMDACFG1f+6uKPDwAAAABJRU5ErkJggg=="
              }
          },
          action: {
              type: "random-template",
              actions: [{
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAMCAYAAABiDJ37AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAABuSURBVDhPY/wPBBc3ljDAgL5/DwMlfLCBu7udoVzKAYoLQbZhA+guwgZgapjAJBUB44UNxf+hbJLDCxufcVeXE9xASoFr6V4GFjE1QzAHZDo2gO4CbABZDdXDEG4gzBYQDcPYALo8uroRF4YMDACFG1f+6uKPDwAAAABJRU5ErkJggg==",
                  brush: "wood",
                  threshold: 50,
                  randomFlipHorizontally: !0
              }, {
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAECAYAAABsgwTvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAA2SURBVChTY7ywofg/AxTo+/cwXNxYAuWRzmfc1eUEN4xSAHcZyBZsAN0l2ABMDROYpApgYAAApXIabwnkhFAAAAAASUVORK5CYII=",
                  brush: "wood",
                  threshold: 50,
                  randomFlipHorizontally: !0
              }]
          }},
      {
            info: {
              displayName: "Garbage",
              category: "template",
              icon: {               
                imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAANCAYAAACzbK7QAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAALoSURBVDhPrZNLbxNnFIafemzPxGPH8SXBxYlzVYAQUC8UKFVUpUWwjgRsWFXqouofQIgVYsMGsWMFYpEVEhJIWSBVaoFGiFZN1KqxQpKSkBSDwXeP4xmPJ/bw2ZgUREEg8Wxmzqcz7/udy3xkC3hPVF+UculRK3o7jtbznVE7Buge3s1Q95e4nYHW6Zt5Z4PB2AgudxCPGqZQLGN6VSSXD38g2sr4fzZb9M3ED9yPzxKODfH3rRts+/wrNkyJ3lgXum5QWtdZW1nCMqpUqyVkjw/bsjg0voe27Z8iBwJcPvVjU/RlmgaR7i8wDA3JIaGXi9Qq6/SO7oWqg1Q6ic8fEqkOdC1LMNzBgbF93Pl1muzaCid3bkPu6SIlKYyTZzrr5Myt68/VBU2Drh07yC4lRLDROMLh9jK48wAeWSGRWMOuWphVnaq5juIJEQp5aQ9sIZ/Joj1cYNTpZG+bzFhQYSrYiT00wMXJS02D5gz2Hz9M6LMR6ihiiBH84a2sLPzJ6up84wZ42hXavF7Rnhx2vUY6lePeXFx87aCmBrhrlriQz3D+3xSBssbBsJNzRyeaBs0Kdn1/jAc35vArPdSqeT7Zv4+yVmHtn3meJO5h26IqyU3N0gn5fRzc7afdXadUV5n+K0nOcvJxbz/5ZAqj8JQ+1Y8a6OP3BzefG7SPjlJPW/SNHEZPL7NhFMmls0Si/ZhWhWIuQ0V7JJJNzn7Xz0BIZjEpMfVbgRobzD40xZwiGBVDtNCDXsphlJb/q6DxIns78XRup3drlLpVJpNKoKUzSG6JcDiKx+sSA95CzFcjvrjESCyIrRfwuxQm7yxjivHZdROXHMTQV5viDTYNXrDn6yMsLy4Q7enn8eoS49+OobR5xbpGuTJ5jWyuIOI6kye6icgVbv5U5PTPebJaoqXwKq/9aDO3r5J/Eif+x5Ro0yJlvSY2RkUT6xvuGxYb5qIg+nz3doa5X5LM3OeN4g1eq+DDAs8Ahn1B1kGf6gkAAAAASUVORK5CYII="

              }
          },
          action: {
              type: "random-template",
              actions: [{
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAPCAYAAAD3T6+hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAKRSURBVDhPvZPbS5NxGMc/7qDbdOacc9V0HqCTp7pQiISIRMtSAsMuisDuMiE6QF0U3hjd1U0XRZdB9AdkN51MLGWKqYXYPE7nITfnge3du7l3szd6MUJRg/Jz8/tdPM/3y/P9/Z64FRm2EZVybhubTvjoyVMcjj7aWr+SlWdHl5iITq1i4IuTmZFvBMRppXJrbGhYcqSKSDSBcxcref3qM72OFnakm4mEw/gXF5HEAPZkHU7PmNKxOetGerKmjuKjtbicowQCAmLQQ4IhQiwaZn5qjNhyECkkcKHIzL1SCxUHi5XOzVljWHvpCiaricCCF/2Kn0BQpLNtgCm3F22CAX1SEgaVHIo6Sr9fS2P7NJ0jUySn5ioKG/NHpDn7DiMKInpTGvimKctM4kW/D602SmxFQ1j0/+wgx2IjbN+PZe8Bxrs6mB9qx6jXk5mWQt+wU1Fbn9UJK85eRlqO4pudxOMaYnJulo5wMuWnThAMBYlpVKTasmm4eYOa+jpU6gSEUIQ4Q7p8N1JXfoim0+mU5hUqiuuzatjT5cDn9cpvZcSakStPZWSXbSfdnR/RavTEQjFu36qnsroUKRZCu+BCPz4IE/2oJRGrNEXvgAf3jEiKJV9RXcuqoXeih4aG87x7/5yHD65jz7LiGh5ErYmXU5TYU1jAyPgkzS8/0fq2G/f4DCqDVVYwEJEf5Vmnn8eOIJaUFUoskG/P4k5VgaL+mzVrcbexCefgBC1vPlBVfZzTZ45x7ep9+fMILPlGlapf5BaU4XGPoTPEy7EmsuR1U5htQme0IaBBF5ljWd7b7vY2pWMLi78VzLYiQkKYsP87u7Mz0RvNCIsCEUki1ZLBQE+zUvmPDP+GdRf/f7LNhvADWH4NREjRt80AAAAASUVORK5CYII=",
                  brush: BrushDefs.COAL,
                  threshold: 50,
                  randomFlipHorizontally: !0
              }, {
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAANCAYAAACzbK7QAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAALoSURBVDhPrZNLbxNnFIafemzPxGPH8SXBxYlzVYAQUC8UKFVUpUWwjgRsWFXqouofQIgVYsMGsWMFYpEVEhJIWSBVaoFGiFZN1KqxQpKSkBSDwXeP4xmPJ/bw2ZgUREEg8Wxmzqcz7/udy3xkC3hPVF+UculRK3o7jtbznVE7Buge3s1Q95e4nYHW6Zt5Z4PB2AgudxCPGqZQLGN6VSSXD38g2sr4fzZb9M3ED9yPzxKODfH3rRts+/wrNkyJ3lgXum5QWtdZW1nCMqpUqyVkjw/bsjg0voe27Z8iBwJcPvVjU/RlmgaR7i8wDA3JIaGXi9Qq6/SO7oWqg1Q6ic8fEqkOdC1LMNzBgbF93Pl1muzaCid3bkPu6SIlKYyTZzrr5Myt68/VBU2Drh07yC4lRLDROMLh9jK48wAeWSGRWMOuWphVnaq5juIJEQp5aQ9sIZ/Joj1cYNTpZG+bzFhQYSrYiT00wMXJS02D5gz2Hz9M6LMR6ihiiBH84a2sLPzJ6up84wZ42hXavF7Rnhx2vUY6lePeXFx87aCmBrhrlriQz3D+3xSBssbBsJNzRyeaBs0Kdn1/jAc35vArPdSqeT7Zv4+yVmHtn3meJO5h26IqyU3N0gn5fRzc7afdXadUV5n+K0nOcvJxbz/5ZAqj8JQ+1Y8a6OP3BzefG7SPjlJPW/SNHEZPL7NhFMmls0Si/ZhWhWIuQ0V7JJJNzn7Xz0BIZjEpMfVbgRobzD40xZwiGBVDtNCDXsphlJb/q6DxIns78XRup3drlLpVJpNKoKUzSG6JcDiKx+sSA95CzFcjvrjESCyIrRfwuxQm7yxjivHZdROXHMTQV5viDTYNXrDn6yMsLy4Q7enn8eoS49+OobR5xbpGuTJ5jWyuIOI6kye6icgVbv5U5PTPebJaoqXwKq/9aDO3r5J/Eif+x5Ro0yJlvSY2RkUT6xvuGxYb5qIg+nz3doa5X5LM3OeN4g1eq+DDAs8Ahn1B1kGf6gkAAAAASUVORK5CYII=",
                  brush: BrushDefs.COAL,
                  threshold: 50,
                  randomFlipHorizontally: !0
              },{
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAARCAYAAAAhUad0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAANoSURBVEhLvZVLbxtVFIA/v8dju7HjuHZqxyalhVAIpEVJQ5oSSoxYdYV4LFCJVIkF6gYk+AUsWSEhNkWqQEhdobKIKlCFQhFxVAhtSltSx7Edx9jxI4nt2BO/xmbquBRogSiR+i1mRnfuOd+dO+fMqJoKPGTU7fNDZVdSwdCD//UzOPb1t0e2x46kF069yHuvjNFtlcnncuj1Bo68MIFBdLdn/Dfbfqc/TLyGHI7Td0jDiv0ge/2HKEx+z8TlImWNkU6Xl9CNWbq8B7g+dZG6nGtH3s//Sq2OfowNiQN6M6aixJDFwBMD+3HbCwSmg3yYamKyetjcLKBRa5BKeeRyEd9TQ1BVE5r/pp3pHvdJ99geZ+DoCBu5IosLIex2G2ZRptPpYjkcpLJWxGVW46jLNKQiAZ0Oo93MajCuJKsrGVSolQU++uQIokEgHl8iFQtsJW/zN+nR0ZMU8nmi4SQWq4NyKYOn9xE8Xid6QUc08jvpaBSLKJBZy6Fxipz64AyRVIiZrwNkZ4NKnA29uIfC+jrmjg50GpGV5Zm2YYs/C2l69idCkbhyZaJSSVCTqwwfO8aY/3kEo4Wbc78hy2q0Og3J1TSul59m8J1xJn+eIhJNICUKdPcOYjTZefa5UYZGX8IkmFlL3Uan69yStGlJz355nm+/C+DyeBFMJmV1RrRUSGdSrCSzNJVplWqDfDbLxnoa5UExyw2yC6vkY1mWZm5BvYHN24fYsZdbv1zjauBH9AYrTu9hjBYPeq29JbxDa3u7fcMMHj/Bjbk56rWCsoVhnL6DNOUm3l4XGr2GRCyDVN7grTE3XpvAQiTNZ1eWEPsfo7yUoBSNIzr68O1z06iVyKbjFDLZVmxXlxvRrOPXq1MtqbZ1VJWRihlWovNIG+HW0F8Z8b9BrSKRWb7NV1MlKvUyOq1APZ+jOR+jlIrT3CzjtApotXUWFyO4e3qVmpA4MX5ceT1mfN57Pdza3mT0GpcunH2g8A7Tl84TDU7TqFeU6k0z6jVQV9rn3Qk/l8+9ytvjHrQqPbWmgVg4hqpRo1ouKZECJUlWOsJEQWmlu2z74/BPLn78JkcOO9EoFXrl8y84/ekqDWsP5UaTfPJ6e9aD2bH0Lp+cHmZyrkjVNYCn7xnOffR++86/s2vpTtjVX2ZnwB83CW8X6RxQJQAAAABJRU5ErkJggg==",
                  brush: BrushDefs.COAL,
                  threshold: 50,
                  randomFlipHorizontally: !0
              }]
          },
          /*{
          info: {
              displayName: "Garbage",
              category: "template",
              icon: {
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAMCAYAAABiDJ37AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAABuSURBVDhPY/wPBBc3ljDAgL5/DwMlfLCBu7udoVzKAYoLQbZhA+guwgZgapjAJBUB44UNxf+hbJLDCxufcVeXE9xASoFr6V4GFjE1QzAHZDo2gO4CbABZDdXDEG4gzBYQDcPYALo8uroRF4YMDACFG1f+6uKPDwAAAABJRU5ErkJggg=="
              }
          },
          action: {
              type: "random-template",
              actions: [{
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAMCAYAAABiDJ37AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAABuSURBVDhPY/wPBBc3ljDAgL5/DwMlfLCBu7udoVzKAYoLQbZhA+guwgZgapjAJBUB44UNxf+hbJLDCxufcVeXE9xASoFr6V4GFjE1QzAHZDo2gO4CbABZDdXDEG4gzBYQDcPYALo8uroRF4YMDACFG1f+6uKPDwAAAABJRU5ErkJggg==",
                  brush: "coal",
                  threshold: 50,
                  randomFlipHorizontally: !0
              }, {
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAECAYAAABsgwTvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAA2SURBVChTY7ywofg/AxTo+/cwXNxYAuWRzmfc1eUEN4xSAHcZyBZsAN0l2ABMDROYpApgYAAApXIabwnkhFAAAAAASUVORK5CYII=",
                  brush: "coal",
                  threshold: 50,
                  randomFlipHorizontally: !0
              }, {
                  type: "image-template",
                  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAECAYAAABsgwTvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAA2SURBVChTY7ywofg/AxTo+/cwXNxYAuWRzmfc1eUEN4xSAHcZyBZsAN0l2ABMDROYpApgYAAApXIabwnkhFAAAAAASUVORK5CYII=",
                  brush: "coal",
                  threshold: 50,
                  randomFlipHorizontally: !0
              }]
          }*/
      }
    ], ToolDefs.ROCK_TEMPLATES.getInfo().derive({
        codeName: 'templates',
        displayName: 'Templates',
        badgeStyle: {
            backgroundColor: '127, 46, 246',
        }
    }));
    
    function buildScene(sandGame) {
        function seed() {
            return Math.trunc(Math.random() * 1024);
        }

        sandGame.layeredTemplate()
          	
            .layerPerlin([
                { factor: 220, threshold: 0, force: 30, seed: 1 },
                { factor: 40, threshold: 0, force: 10, seed: 1 },
                { factor: 5, threshold: 0, force: 4, seed: 1 },
            ], true, BrushDefs.GRAVEL);
      //acid
        sandGame.graphics().drawRectangle(76, 70, 150, 80, mySandBrush);
//outer bowl of power plant
        sandGame.graphics().drawLine(280, 40, 300, 80,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(280, 40, 250, -40 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(200, 40, 180, 80,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(200, 40, 230, -40 ,4, BrushDefs.METAL, true);
      //inner bowl
        sandGame.graphics().drawLine(270, 40, 290, 80,2, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(270, 40, 240, -40 ,2, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(210, 40, 190, 80,2, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(210, 40, 240, -40 ,2, BrushDefs.METAL, true);
      //floor
        sandGame.graphics().drawLine(180, 80, 300, 80 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawRectangle(176, 107, 300, 153, BrushDefs.COAL);
        sandGame.graphics().drawRectangle(176, 110, 300, 160, BrushDefs.ROCK);
      //support
      
        sandGame.graphics().drawLine(176, 110, 180, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(196, 110, 180, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(196, 110, 200, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(216, 110, 200, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(216, 110, 220, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(236, 110, 220, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(236, 110, 240, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(256, 110, 240, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(256, 110, 260, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(276, 110, 260, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(276, 110, 280, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(296, 110, 280, 90 ,4, BrushDefs.METAL, true);
        sandGame.graphics().drawLine(296, 110, 300, 90 ,4, BrushDefs.METAL, true);
    
    }
    
    return {
        scene: {
            init: buildScene
        },
            //any tool with ToolDefs. before it is from SGJS
        tools: [
            ToolDefs.ERASE,
            ToolDefs.MOVE,
            ToolDefs.FIRE,
            mySandTool,
            myTextureTool,
            MY_SAND_2_TOOL,
            MY_TEMPLATE,
            ToolDefs.SOIL,
            ToolDefs.GRAVEL,
            ToolDefs.WALL,
        ],
        disableSizeChange: false,
        disableSceneSelection: true,
      	debug: true
    }
    