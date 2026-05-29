import { Switch, Route } from "wouter";
import { PlannerProvider } from "@/lib/plannerContext";
import PlannerEntry from "./PlannerEntry";
import TripStyleScreen from "./TripStyleScreen";
import TailorScreen from "./TailorScreen";
import GenerationScreen from "./GenerationScreen";
import TripPlanView from "./TripPlanView";
import PassesScreen from "./PassesScreen";
import StartAdventureConfirmation from "./StartAdventureConfirmation";

export default function TripPlanner() {
  return (
    <PlannerProvider>
      <Switch>
        <Route path="/style" component={TripStyleScreen} />
        <Route path="/tailor" component={TailorScreen} />
        <Route path="/generating" component={GenerationScreen} />
        <Route path="/plan" component={TripPlanView} />
        <Route path="/passes" component={PassesScreen} />
        <Route path="/start" component={StartAdventureConfirmation} />
        <Route component={PlannerEntry} />
      </Switch>
    </PlannerProvider>
  );
}
