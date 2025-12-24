# Missing Legacy Foods Report

This report compares the legacy food list (from `usda-abridged-pub.csv`) against the current My Nutrients app database (`foodDatabaseData.js`) and the upstream source data (`mastered-nutrient-data.json`).

## Summary

| Metric | Count | Description |
| :--- | :--- | :--- |
| **Total Legacy Foods** | **346** | Derived from the original PDF/CSV. |
| **Already in App** | **218** | Successfully migrated and present in the current database. |
| **Missing from App** | **128** | Foods from the legacy list not found in the current app. |
| &nbsp;&nbsp;↳ _Confirmed Restorable_ | _91_ | Exact name matches found in the upstream data. |
| &nbsp;&nbsp;↳ _Likely Restorable_ | _37_ | No exact match, but likely exist with slightly different names (e.g., "Cheese, cheddar" vs "Cheese, cheddar (Includes...)"). |

## Analysis & Recommendation

**Good news**: All 128 missing foods appear to be available in the upstream data, either as exact matches or with minor naming variations (e.g., extra qualifiers in parentheses).

**Action**: You can restore these foods to the app by adding their names to your `keep-list.txt` file and re-running the curation pipeline. The curation script's normalization logic should handle the minor naming differences (like removing "(Includes...)" or "with added...") automatically.

## 1. Confirmed Restorable (Exact Matches)
*These 91 foods have exact matches in the upstream data and can be added directly to your keep list.*

- Tofu, raw, firm, prepared with calcium sulfate
- Turnip greens, frozen, cooked, boiled, drained, without salt
- Fish, salmon, pink, canned, drained solids
- Cereals, WHEATENA, cooked with water
- Collards, frozen, chopped, unprepared
- Fish, salmon, pink, canned, without salt, solids with bone and liquid
- Snacks, trail mix, regular, with chocolate chips, unsalted nuts and seeds
- Cereals, CREAM OF WHEAT, instant, prepared with water, without salt
- Cereals, oats, instant, fortified, with raisins and spice, prepared with water
- Beans, baked, canned, with pork
- Turnip greens, frozen, cooked, boiled, drained, with salt
- Cereals ready-to-eat, QUAKER Oatmeal Squares, Golden Maple
- Beans, black turtle, mature seeds, cooked, boiled, without salt
- Turnip greens, frozen, unprepared
- Kale, frozen, unprepared
- Soup, black bean, canned, condensed
- Broccoli, frozen, chopped, unprepared
- Tomatoes, red, ripe, canned, stewed
- Squash, winter, butternut, cooked, baked, without salt
- Beans, black turtle, mature seeds, canned
- Tomatoes, red, ripe, canned, packed in tomato juice
- Peas, edible-podded, frozen, unprepared
- Figs, canned, water pack, solids and liquids
- Fish, mackerel, jack, canned, drained solids
- Okra, frozen, cooked, boiled, drained, without salt
- Peas and carrots, frozen, cooked, boiled, drained, without salt
- Blueberries, wild, canned, heavy syrup, drained
- Cake, shortcake, biscuit-type, prepared from recipe
- Lima beans, immature seeds, frozen, baby, unprepared
- Cake, chocolate, prepared from recipe without frosting
- Beans, snap, green, frozen, cooked, boiled, drained without salt
- Onions, frozen, whole, cooked, boiled, drained, without salt
- Nuts, almond butter, plain, with salt added
- Soybeans, mature seeds, sprouted, cooked, steamed
- Beans, pinto, immature seeds, frozen, unprepared
- Water convolvulus, cooked, boiled, drained, with salt
- Rice, white, long-grain, regular, raw, unenriched
- Soup, chicken with rice, canned, condensed
- Turnips, frozen, cooked, boiled, drained, without salt
- Boysenberries, canned, heavy syrup
- Squash, winter, butternut, frozen, cooked, boiled, without salt
- Tomato products, canned, puree, without salt added
- Soup, beef and vegetables, canned, ready-to-serve
- Beets, canned, regular pack, solids and liquids
- Blackberries, frozen, unsweetened
- Sweet potato, cooked, baked in skin, flesh, with salt
- Cake, angelfood, dry mix, prepared
- Tomato products, canned, sauce, with onions
- Soup, cream of celery, canned, prepared with equal volume water
- Cake, angelfood, commercially prepared
- Asparagus, canned, drained solids
- Squash, summer, zucchini, italian style, canned
- Cake, coffeecake, cinnamon with crumb topping, dry mix, prepared
- Lima beans, immature seeds, frozen, fordhook, unprepared
- Loganberries, frozen
- Carrots, canned, no salt added, solids and liquids
- Grapefruit, sections, canned, water pack, solids and liquids
- Carrots, canned, regular pack, drained solids
- Boysenberries, frozen, unsweetened
- Squash, winter, hubbard, baked, with salt
- Onions, frozen, whole, unprepared
- Soup, pea, split with ham, canned, chunky, ready-to-serve
- Sweet potato, canned, syrup pack, drained solids
- Tomato products, canned, sauce, with onions, green peppers, and celery
- Pork, fresh, shoulder, whole, separable lean and fat, cooked, roasted
- Asparagus, frozen, cooked, boiled, drained, without salt
- Cereals ready-to-eat, POST, Shredded Wheat, original spoon-size
- Chicken, broiler, rotisserie, BBQ, back meat only
- Cherries, sweet, canned, water pack, solids and liquids
- Turkey, all classes, leg, meat and skin, cooked, roasted
- Soup, onion, canned, condensed
- Soup, pea, green, canned, condensed
- Cereals ready-to-eat, POST, Shredded Wheat, original big biscuit
- Chicken, broilers or fryers, dark meat, meat only, cooked, fried
- Cherries, sour, red, canned, light syrup pack, solids and liquids
- Tamarind nectar, canned
- Muffin, blueberry, commercially prepared, low-fat
- Soup, chicken, canned, chunky, ready-to-serve
- Grapes, canned, thompson seedless, water pack, solids and liquids
- Tomato products, canned, sauce, with tomato tidbits
- Tomato juice, canned, with salt added
- Soup, chicken gumbo, canned, condensed
- Squash, winter, hubbard, cooked, boiled, mashed, with salt
- Apricots, canned, heavy syrup pack, with skin, solids and liquids
- Soup, cream of shrimp, canned, prepared with equal volume water
- Apricots, canned, heavy syrup, drained
- Cereals, QUAKER, Instant Oatmeal Organic, Regular
- Pie, banana cream, prepared from recipe
- Cauliflower, green, raw
- Cake, sponge, commercially prepared
- Potatoes, baked, skin, without salt

## 2. Likely Restorable (Naming Variations)
*These 37 foods were not found with an exact string match, but likely exist in the upstream data with extra details (e.g., "Cheese, cheddar (Includes...)") that the curation normalization process removes. You should try adding these to your keep list as well.*

- Cheese, cheddar
- Milk, nonfat, fluid, protein fortified
- Milk, reduced fat, fluid, 2% milkfat, protein fortified
- Milk, lowfat, fluid, 1% milkfat, protein fortified
- Milk, chocolate, fluid, commercial, whole
- Milk, chocolate, fluid, commercial, reduced fat
- Yogurt, fruit, low fat, 9g protein/8 oz
- Bagels, plain, enriched
- Milk, canned, evaporated, with added vitamin D
- Potatoes, mashed, dehydrated, prepared from granules with milk
- Bread, cornbread, dry mix, prepared with 2% milk
- Potatoes, mashed, dehydrated, prepared from flakes without milk
- Muffins, English, mixed-grain
- Pork, fresh, loin, country-style ribs, separable lean only
- Lima beans, immature seeds, frozen, baby, cooked
- Pork, fresh, loin, country-style ribs, separable lean and fat
- Bread, salvadoran sweet cheese
- Cowpeas (blackeyes), immature seeds, frozen, cooked
- Squash, summer, crookneck and straightneck, frozen, cooked
- Leeks, (bulb and lower leaf-portion), cooked, boiled, drained
- Hyacinth-beans, immature seeds, cooked, boiled, drained
- Squash, summer, zucchini, includes skin, cooked, boiled, drained
- Beef, shank crosscuts, separable lean only, trimmed to 1/4 fat
- Pasta, whole-wheat, dry
- Beef, loin, top loin, separable lean and fat, trimmed to 1/8 fat
- Beef, tenderloin, steak, separable lean and fat, trimmed to 1/8 fat
- Pork, fresh, shoulder, blade, boston (roasts), separable lean and fat
- Lamb, Australian, imported, fresh, shoulder ,blade, separable lean only
- Carrots, frozen, unprepared
- Lamb, shoulder, blade, separable lean and fat, trimmed to 1/8 fat
- Pork, fresh, shoulder, (Boston butt), blade (steaks), separable lean and fat
- Lamb, New Zealand, imported, frozen, shoulder, whole (arm and blade)
- Lamb, Australian, imported, fresh, shoulder, arm, separable lean and fat
- Beef, short loin, porterhouse steak, separable lean and fat
- Pancakes, plain, frozen, ready-to-heat, microwave
- Cherries, sour, red, frozen, unsweetened
- Lamb, New Zealand, imported, frozen, loin, separable lean and fat
