# Universal Event Model

The Universal Event Model (UEM) provides a single framework for describing any athletic
event across sports.

## 1. Event Code

A structured string representing:
- Sport (TFR, XC, SWM, SOC)
- Gender (M, W, C)
- Event type (100M, 5K, LJ, 100FREE)

Example: `TFR_M_1500M`

## 2. Event Definition Levels

1. **Global Definition**  
   - Sport, discipline type (timed, distance, judged)
   - Unit format (seconds, meters, points)

2. **Instance Definition**  
   - Meet-specific instance
   - Linked via `results_events.event_code`

3. **Performance**  
   - Outcome specific to athlete/team+event instance

## 3. Data Flow

1. `results_events` define instance of event for a meet  
2. `results_entries` assign athletes/teams  
3. `results_performances` store outcomes  
4. `athlete_performances` mirrors core details for profile/history

## 4. Sport Adaptability

The UEM supports:
- Track & field
- Cross-country
- Swimming (similar timed/heat structure)
- Court/field sports (via scoring/point events)

