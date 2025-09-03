Product Requirements Document for a cachier reconciliation dashboard

1. **Product Title**: Cachier reconciliation: your custom reconciliation solution for all cachiers

2. **Purpose**: 

The Cachier reconciliation app is designed to help users check their reconciliation data and filter them. This app will serve as a browsing tool, a dataset explorer for cachier reconciliation. in the first stage the demo the data will be coming from mock data, and later on we'll connect it to a specific API but we don't have to worry about that now. 

3. **Features and Functionality**:

    3.1. **Dashboard selection**: To allow users to pick an "area code", an "outlet ID" and a business day before reaching the dashboard view
    
    3.2. **Dashboard View**: A table with filter, and topics , and we have to load the filters for all the topics that are selected, users can select multiple topics at once, once the filters are loaded based on the topics now all the data source for all dashboard would be coming from dummy data json files, as well as the filter values. you can find attached a mockup for the page in general "dashboard.png" (the header doesn't have to be functional it's just for demo purposes )

    3.2.1. **Topics**:  we have a list of topics under "topics.json" that should show under a multiple selection dropdown and directly related to each filter, by default TopicTag 'POS_CARDS' is loaded with it's appropriate Filters example  "AvailableFilterTags": ["TERMINAL", "DRIVER", "PAYMENT_METHOD", "ROUTE"], and the data should only show the first level row where "NodeTag" is "TOPIC" and "NodeLabel" is "Pos Cards" and of course all the rows "ChildNodes" under. 
        
    3.2.2. **Filters**:  the filters are loaded based on the topics, all filters should be coming from "filters.json", the filter values should be coming from "FilterValues" key and the state that is managing the filters should save them under the key coming from "FilterTag", and the "FilterLabel" is for displaying the label next to the multiple value dropdowns and the selected filters. once the user selects any filter the system should filter by NodeTag and NodeLabel example:
            3.2.2.1. **Example Filter**: if Filter Driver is selected with a value of "Ali Mostafa", then all the objects containing the below NodeTag and NodeLabel should show: "NodeTag": "DRIVER", and "NodeLabel": "Ali Mostafa".
            3.2.2.2. **Multiple Filters**: the system should allow the user to select multiple filters as well as re-ordering the filters themselves ( this currently won't affect the front-end filtering, but will be really helpful once we hook everything to the api) 

    3.2.3. **Table hiearchy and columns**: find below the columns order and groups that should be showing. Find attached screenshot called "screenshot_table.png" that should show the correct order that we're expecting

        3.2.3.1. **Columns ordering and groupping**: find attached an image showing how I want the data to be shown, keep in mind that each row has the same structure in addition of a special key called "ChildNodes" to show the nested rows . find the desired Columns order and it's appropriate mapping below: 
        -Col 1: Topic (NodeLabel)
        -Col 2: Records Verifications (%) (no datasource, header group )
            -Col 2.1: Recorded (row.RecordsVerification.Recorded)
            -Col 2.2: Verified (row.RecordsVerification.Verified)
            -Col 2.3: Current Day Variances ( no datasource, header group)
                -Col 2.3.1: Outstanding (row.RecordsVerification.CurrentDayVariances.Outstanding)
                -Col 2.3.2: Exceptions (row.RecordsVerification.CurrentDayVariances.Exceptions)
            -Col 2.4: Cumulative Vairances ( no datasource, header group)
                -Col 2.3.1: Outstanding (row.RecordsVerification.CumulativeVariances.Outstanding)
                -Col 2.3.2: Exceptions (row.RecordsVerification.CumulativeVariances.Exceptions)
        -Col 3: Settlement Verification (%) (no datasource, header group )
            -Col 3.1: Claimed (row.SettlementVerification.Claimed)
            -Col 3.2: Settled (row.SettlementVerification.Settled)
            -Col 3.3: Current Day Variances ( no datasource, header group)
                -Col 3.3.1: Awaiting Settlement (row.SettlementVerification.CurrentDayVariances.AwaitingSettlement)
                -Col 3.3.2: Exceptions (row.SettlementVerification.CurrentDayVariances.Exceptions)
            -Col 3.4: Cumulative Vairances ( no datasource, header group)
                -Col 3.3.1: Awaiting Settlement (row.SettlementVerification.CumulativeVariances.AwaitingSettlement)
                -Col 3.3.2: Exceptions (row.SettlementVerification.CumulativeVariances.Exceptions)

4. **Behavior of the Product**:
    4.1. Users will be prompted to choose an area from a dropdown (data from "areas.json"), an outlet (also data from "outlets.json") and a business day from a date picker that would default to todays date, up when they open the app on the root level example '/dashboard-selection'.
  
    4.2. Once all 3 values are selected from the dashboard selection view, the system should load the appropriate datasets, example if the user chooses area "1245", outlet "9865" and "2025-09-02" for a day the system should load up the appropriate json file which in this case would be 1245_9865_02092025.json from the mock data folder, once loaded, users will be able to browse the existing dataset from the dashboard view, toggle multiple Topics at once, play around with the filters ( frontend filtering for now ).
 